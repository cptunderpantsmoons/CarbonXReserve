// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./OracleConsumer.sol";

contract cACCU is ERC1155, Ownable, Pausable {
    struct BatchMetadata {
        string projectID;
        uint256 vintage;
        string methodology;
        string geoHash;
        address custodian;
        uint256 mintedAt;
    }

    mapping(uint256 => BatchMetadata) public batchInfo;
    mapping(address => bool) public isKYCApproved;
    OracleConsumer public oracleConsumer;

    event BatchMinted(uint256 indexed batchId, address indexed to, uint256 amount, string projectID);
    event BatchRedeemed(uint256 indexed batchId, address indexed from, uint256 amount, string projectID);

    constructor(address _oracleConsumer) ERC1155("https://carbonx.au/api/metadata/{id}.json") {
        oracleConsumer = OracleConsumer(_oracleConsumer);
    }

    function mintBatch(
        address to,
        uint256 batchId,
        uint256 amount,
        string memory projectID,
        uint256 vintage,
        string memory methodology,
        string memory geoHash,
        string memory transferId,
        bytes32 requestId
    ) external onlyOwner whenNotPaused {
        require(isKYCApproved[to], "KYC required for recipient");
        require(batchInfo[batchId].mintedAt == 0, "Batch already exists");
        require(oracleConsumer.getConfirmation(requestId), "ANREU transfer not confirmed");
        _mint(to, batchId, amount, "");
        batchInfo[batchId] = BatchMetadata(projectID, vintage, methodology, geoHash, msg.sender, block.timestamp);
        emit BatchMinted(batchId, to, amount, projectID);
    }

    function redeem(uint256 batchId, uint256 amount, string memory transferId, bytes32 requestId) external whenNotPaused {
        require(isKYCApproved[msg.sender], "KYC required");
        require(amount > 0, "Amount must be positive");
        require(oracleConsumer.getConfirmation(requestId), "Retirement not confirmed");
        _burn(msg.sender, batchId, amount);
        emit BatchRedeemed(batchId, msg.sender, amount, batchInfo[batchId].projectID);
    }

    function setKYC(address user, bool approved) external onlyOwner {
        isKYCApproved[user] = approved;
    }

    function setOracleConsumer(address _oracleConsumer) external onlyOwner {
        oracleConsumer = OracleConsumer(_oracleConsumer);
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
        if (from != address(0) && to != address(0)) { // transfer, not mint or burn
            for (uint256 i = 0; i < ids.length; i++) {
                require(isKYCApproved[from], "KYC required for sender");
                require(isKYCApproved[to], "KYC required for receiver");
            }
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
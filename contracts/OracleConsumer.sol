// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/libraries/FunctionsRequest.sol";

/**
 * @title OracleConsumer
 * @dev Contract to request ANREU transfer confirmations using Chainlink Functions
 */
contract OracleConsumer is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    bytes32 public donId; // DON ID for the Functions DON to use
    uint32 public gasLimit; // Gas limit for the callback
    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    mapping(bytes32 => bool) public requestIdToConfirmation;
    mapping(bytes32 => address) public requestIdToRequester;

    event RequestANREUConfirmation(bytes32 indexed requestId, address indexed requester, string transferId);
    event ANREUConfirmationReceived(bytes32 indexed requestId, bool confirmed);

    /**
     * @dev Constructor sets the router address and DON ID
     * @param router The Chainlink Functions router address
     * @param _donId The DON ID for Chainlink Functions
     */
    constructor(address router, bytes32 _donId) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        donId = _donId;
        gasLimit = 300000;
    }

    /**
     * @dev Request ANREU transfer confirmation
     * @param transferId The ID of the transfer to verify
     * @param source The JavaScript source code for the Functions request
     */
    function requestANREUConfirmation(string memory transferId, string memory source) public returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        req.addDONHostedSecrets("", new bytes(0)); // No secrets
        req.addArgs(abi.encodePacked(transferId));

        s_lastRequestId = _sendRequest(req.encodeCBOR(), donId, gasLimit, address(this));
        requestIdToRequester[s_lastRequestId] = msg.sender;
        emit RequestANREUConfirmation(s_lastRequestId, msg.sender, transferId);
        return s_lastRequestId;
    }

    /**
     * @dev Callback function called by Chainlink Functions
     * @param requestId The request ID
     * @param response The response from the off-chain function
     * @param err The error from the off-chain function
     */
    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
        s_lastResponse = response;
        s_lastError = err;

        if (err.length == 0) {
            // Parse response as boolean
            bool confirmed = abi.decode(response, (bool));
            requestIdToConfirmation[requestId] = confirmed;
            emit ANREUConfirmationReceived(requestId, confirmed);
        } else {
            // Handle error - assume false for security
            requestIdToConfirmation[requestId] = false;
            emit ANREUConfirmationReceived(requestId, false);
        }
    }

    /**
     * @dev Get confirmation status for a request
     * @param requestId The request ID
     * @return confirmed Whether the transfer is confirmed
     */
    function getConfirmation(bytes32 requestId) public view returns (bool confirmed) {
        return requestIdToConfirmation[requestId];
    }

    /**
     * @dev Set the gas limit for requests
     * @param _gasLimit The gas limit
     */
    function setGasLimit(uint32 _gasLimit) public onlyOwner {
        gasLimit = _gasLimit;
    }

    /**
     * @dev Set the DON ID
     * @param _donId The DON ID
     */
    function setDonId(bytes32 _donId) public onlyOwner {
        donId = _donId;
    }

    /**
     * @dev Test function to manually set confirmation (only for testing)
     * @param requestId The request ID
     * @param confirmed The confirmation status
     */
    function setConfirmationForTest(bytes32 requestId, bool confirmed) public onlyOwner {
        requestIdToConfirmation[requestId] = confirmed;
    }
}
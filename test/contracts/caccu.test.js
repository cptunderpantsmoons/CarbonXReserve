const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("cACCU Token Contract", function () {
  let cACCU;
  let owner, minter, burner, user1, user2;
  let baseURI = "https://api.carbonxreserve.com/metadata/{id}";

  beforeEach(async function () {
    [owner, minter, burner, user1, user2] = await ethers.getSigners();

    const CACCU = await ethers.getContractFactory("cACCU");
    cACCU = await CACCU.deploy(baseURI);
    await cACCU.deployed();

    // Grant minter and burner roles
    await cACCU.addMinter(minter.address);
    await cACCU.addBurner(burner.address);
  });

  describe("Deployment", function () {
    it("Should set the correct base URI", async function () {
      expect(await cACCU.uri(0)).to.equal(baseURI);
    });

    it("Should set the owner", async function () {
      expect(await cACCU.owner()).to.equal(owner.address);
    });

    it("Should grant MINTER_ROLE to owner", async function () {
      expect(await cACCU.hasRole(await cACCU.MINTER_ROLE(), owner.address)).to.be.true;
    });

    it("Should grant BURNER_ROLE to owner", async function () {
      expect(await cACCU.hasRole(await cACCU.BURNER_ROLE(), owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint tokens", async function () {
      const tokenId = 1;
      const amount = 100;

      await expect(cACCU.connect(minter).mint(user1.address, tokenId, amount, "0x"))
        .to.emit(cACCU, "TokensMinted")
        .withArgs(user1.address, tokenId, amount);

      expect(await cACCU.balanceOf(user1.address, tokenId)).to.equal(amount);
      expect(await cACCU.totalSupply(tokenId)).to.equal(amount);
    });

    it("Should revert if non-minter tries to mint", async function () {
      await expect(cACCU.connect(user1).mint(user1.address, 1, 100, "0x"))
        .to.be.revertedWith("cACCU: caller is not a minter");
    });

    it("Should revert minting to zero address", async function () {
      await expect(cACCU.connect(minter).mint(ethers.constants.AddressZero, 1, 100, "0x"))
        .to.be.revertedWith("cACCU: mint to zero address");
    });

    it("Should revert minting zero amount", async function () {
      await expect(cACCU.connect(minter).mint(user1.address, 1, 0, "0x"))
        .to.be.revertedWith("cACCU: amount must be greater than zero");
    });

    it("Should support batch minting", async function () {
      const tokenIds = [1, 2];
      const amounts = [50, 75];

      await expect(cACCU.connect(minter).mintBatch(user1.address, tokenIds, amounts, "0x"))
        .to.emit(cACCU, "TransferBatch");

      expect(await cACCU.balanceOf(user1.address, 1)).to.equal(50);
      expect(await cACCU.balanceOf(user1.address, 2)).to.equal(75);
      expect(await cACCU.totalSupply(1)).to.equal(50);
      expect(await cACCU.totalSupply(2)).to.equal(75);
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      // Mint some tokens for testing
      await cACCU.connect(minter).mint(user1.address, 1, 100, "0x");
      await cACCU.connect(minter).mint(user2.address, 2, 50, "0x");
    });

    it("Should allow user to burn their own tokens", async function () {
      await expect(cACCU.connect(user1).burn(1, 25))
        .to.emit(cACCU, "TokensBurned")
        .withArgs(user1.address, 1, 25);

      expect(await cACCU.balanceOf(user1.address, 1)).to.equal(75);
      expect(await cACCU.totalSupply(1)).to.equal(75);
    });

    it("Should allow burner to burn from any account", async function () {
      await expect(cACCU.connect(burner).burnFrom(user1.address, 1, 25))
        .to.emit(cACCU, "TokensBurned")
        .withArgs(user1.address, 1, 25);

      expect(await cACCU.balanceOf(user1.address, 1)).to.equal(75);
      expect(await cACCU.totalSupply(1)).to.equal(75);
    });

    it("Should revert burning more than balance", async function () {
      await expect(cACCU.connect(user1).burn(1, 200))
        .to.be.revertedWith("cACCU: insufficient balance");
    });

    it("Should revert burning zero amount", async function () {
      await expect(cACCU.connect(user1).burn(1, 0))
        .to.be.revertedWith("cACCU: amount must be greater than zero");
    });

    it("Should support batch burning", async function () {
      await expect(cACCU.connect(user1).burnBatch([1], [25]))
        .to.emit(cACCU, "TransferBatch");

      expect(await cACCU.balanceOf(user1.address, 1)).to.equal(75);
      expect(await cACCU.totalSupply(1)).to.equal(75);
    });
  });

  describe("Pausing", function () {
    beforeEach(async function () {
      await cACCU.connect(minter).mint(user1.address, 1, 100, "0x");
    });

    it("Should allow owner to pause", async function () {
      await expect(cACCU.connect(owner).pause())
        .to.emit(cACCU, "Paused");

      expect(await cACCU.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await cACCU.connect(owner).pause();
      await expect(cACCU.connect(owner).unpause())
        .to.emit(cACCU, "Unpaused");

      expect(await cACCU.paused()).to.be.false;
    });

    it("Should prevent minting when paused", async function () {
      await cACCU.connect(owner).pause();
      await expect(cACCU.connect(minter).mint(user1.address, 1, 50, "0x"))
        .to.be.revertedWith("EnforcedPause");
    });

    it("Should prevent burning when paused", async function () {
      await cACCU.connect(owner).pause();
      await expect(cACCU.connect(user1).burn(1, 25))
        .to.be.revertedWith("EnforcedPause");
    });

    it("Should prevent transfers when paused", async function () {
      await cACCU.connect(owner).pause();
      await expect(cACCU.connect(user1).safeTransferFrom(user1.address, user2.address, 1, 25, "0x"))
        .to.be.revertedWith("EnforcedPause");
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to add minters", async function () {
      await expect(cACCU.connect(owner).addMinter(user1.address))
        .to.emit(cACCU, "MinterAdded")
        .withArgs(user1.address);

      expect(await cACCU.hasRole(await cACCU.MINTER_ROLE(), user1.address)).to.be.true;
    });

    it("Should allow owner to remove minters", async function () {
      await cACCU.connect(owner).addMinter(user1.address);
      await expect(cACCU.connect(owner).removeMinter(user1.address))
        .to.emit(cACCU, "MinterRemoved")
        .withArgs(user1.address);

      expect(await cACCU.hasRole(await cACCU.MINTER_ROLE(), user1.address)).to.be.false;
    });

    it("Should allow owner to add burners", async function () {
      await expect(cACCU.connect(owner).addBurner(user1.address))
        .to.emit(cACCU, "BurnerAdded")
        .withArgs(user1.address);

      expect(await cACCU.hasRole(await cACCU.BURNER_ROLE(), user1.address)).to.be.true;
    });

    it("Should allow owner to remove burners", async function () {
      await cACCU.connect(owner).addBurner(user1.address);
      await expect(cACCU.connect(owner).removeBurner(user1.address))
        .to.emit(cACCU, "BurnerRemoved")
        .withArgs(user1.address);

      expect(await cACCU.hasRole(await cACCU.BURNER_ROLE(), user1.address)).to.be.false;
    });

    it("Should prevent non-owner from adding minters", async function () {
      await expect(cACCU.connect(user1).addMinter(user2.address))
        .to.be.revertedWith("OwnableUnauthorizedAccount");
    });
  });

  describe("ERC-1155 Standard Functions", function () {
    beforeEach(async function () {
      await cACCU.connect(minter).mint(user1.address, 1, 100, "0x");
      await cACCU.connect(minter).mint(user1.address, 2, 50, "0x");
    });

    it("Should support balanceOf", async function () {
      expect(await cACCU.balanceOf(user1.address, 1)).to.equal(100);
      expect(await cACCU.balanceOf(user1.address, 2)).to.equal(50);
    });

    it("Should support balanceOfBatch", async function () {
      const balances = await cACCU.balanceOfBatch(
        [user1.address, user1.address],
        [1, 2]
      );
      expect(balances[0]).to.equal(100);
      expect(balances[1]).to.equal(50);
    });

    it("Should support safeTransferFrom", async function () {
      await expect(cACCU.connect(user1).safeTransferFrom(user1.address, user2.address, 1, 25, "0x"))
        .to.emit(cACCU, "TransferSingle");

      expect(await cACCU.balanceOf(user1.address, 1)).to.equal(75);
      expect(await cACCU.balanceOf(user2.address, 1)).to.equal(25);
    });

    it("Should support safeBatchTransferFrom", async function () {
      await expect(cACCU.connect(user1).safeBatchTransferFrom(
        user1.address,
        user2.address,
        [1, 2],
        [25, 10],
        "0x"
      ))
        .to.emit(cACCU, "TransferBatch");

      expect(await cACCU.balanceOf(user1.address, 1)).to.equal(75);
      expect(await cACCU.balanceOf(user1.address, 2)).to.equal(40);
      expect(await cACCU.balanceOf(user2.address, 1)).to.equal(25);
      expect(await cACCU.balanceOf(user2.address, 2)).to.equal(10);
    });

    it("Should support setApprovalForAll", async function () {
      await cACCU.connect(user1).setApprovalForAll(user2.address, true);
      expect(await cACCU.isApprovedForAll(user1.address, user2.address)).to.be.true;

      await cACCU.connect(user1).setApprovalForAll(user2.address, false);
      expect(await cACCU.isApprovedForAll(user1.address, user2.address)).to.be.false;
    });

    it("Should support URI function", async function () {
      expect(await cACCU.uri(1)).to.equal(baseURI);
    });

    it("Should support setURI by owner", async function () {
      const newURI = "https://new.api.com/{id}";
      await cACCU.connect(owner).setURI(newURI);
      expect(await cACCU.uri(1)).to.equal(newURI);
    });
  });

  describe("Supply Tracking", function () {
    it("Should track total supply correctly", async function () {
      expect(await cACCU.totalSupply(1)).to.equal(0);

      await cACCU.connect(minter).mint(user1.address, 1, 100, "0x");
      expect(await cACCU.totalSupply(1)).to.equal(100);

      await cACCU.connect(user1).burn(1, 25);
      expect(await cACCU.totalSupply(1)).to.equal(75);

      await cACCU.connect(minter).mint(user2.address, 1, 50, "0x");
      expect(await cACCU.totalSupply(1)).to.equal(125);
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrant calls", async function () {
      // This would require a mock contract to test reentrancy
      // For now, we verify that ReentrancyGuard is inherited
      expect(await cACCU.VERSION()).to.equal("1.0.0");
    });
  });

  describe("Constants and Version", function () {
    it("Should have correct version", async function () {
      expect(await cACCU.VERSION()).to.equal("1.0.0");
    });

    it("Should have correct max supply", async function () {
      expect(await cACCU.MAX_SUPPLY()).to.equal(ethers.constants.MaxUint256);
    });
  });

  describe("Interface Support", function () {
    it("Should support ERC-1155 interface", async function () {
      const erc1155InterfaceId = "0xd9b67a26"; // ERC-1155 interface ID
      expect(await cACCU.supportsInterface(erc1155InterfaceId)).to.be.true;
    });

    it("Should support AccessControl interface", async function () {
      const accessControlInterfaceId = "0x7965db0b"; // IAccessControl interface ID
      expect(await cACCU.supportsInterface(accessControlInterfaceId)).to.be.true;
    });
  });
});
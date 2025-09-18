const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("cACCU", function () {
    let cACCU, oracleConsumer, owner, addr1, addr2;

    beforeEach(async function () {
        const OracleConsumerFactory = await ethers.getContractFactory("OracleConsumer");
        // Mock oracle constructor parameters - router and donId
        const mockRouter = ethers.constants.AddressZero;
        const mockDonId = ethers.utils.formatBytes32String("test");
        oracleConsumer = await OracleConsumerFactory.deploy(mockRouter, mockDonId);
        await oracleConsumer.deployed();

        const cACCUFactory = await ethers.getContractFactory("cACCU");
        cACCU = await cACCUFactory.deploy(oracleConsumer.address);
        await cACCU.deployed();
        [owner, addr1, addr2] = await ethers.getSigners();
    });

    it("Should mint batch and set batchInfo correctly", async function () {
        const projectID = "project1";
        const vintage = 2023;
        const methodology = "method1";
        const geoHash = "geo1";
        const transferId = "transfer1";
        const mockRequestId = ethers.utils.formatBytes32String("mock");

        // Mock confirmation
        await oracleConsumer.setConfirmationForTest(mockRequestId, true);

        await cACCU.mintBatch(addr1.address, 1, 100, projectID, vintage, methodology, geoHash, transferId, mockRequestId);
        const batch = await cACCU.batchInfo(1);
        expect(batch.projectID).to.equal(projectID);
        expect(batch.vintage).to.equal(vintage);
        expect(batch.methodology).to.equal(methodology);
        expect(batch.geoHash).to.equal(geoHash);
        expect(batch.custodian).to.equal(owner.address);
        expect(batch.mintedAt).to.be.above(0);
    });

    it("Should revert transfer if not KYC approved", async function () {
        const transferId = "transfer1";
        const mockRequestId = ethers.utils.formatBytes32String("mock");
        await oracleConsumer.setConfirmationForTest(mockRequestId, true);
        await cACCU.mintBatch(owner.address, 1, 100, "p", 2000, "m", "g", transferId, mockRequestId);
        await expect(cACCU.safeTransferFrom(owner.address, addr1.address, 1, 10, "0x")).to.be.revertedWith("KYC required for sender");
        await cACCU.setKYC(owner.address, true);
        await cACCU.setKYC(addr1.address, true);
        await expect(cACCU.safeTransferFrom(owner.address, addr1.address, 1, 10, "0x")).to.not.be.reverted;
    });

    it("Should redeem and burn tokens + emit event", async function () {
        const batchId = 1;
        const amount = 10;
        const projectID = "p";
        const transferId = "transfer1";
        const mockRequestId = ethers.utils.formatBytes32String("mock");
        await oracleConsumer.setConfirmationForTest(mockRequestId, true);
        await cACCU.mintBatch(addr1.address, batchId, 100, projectID, 2000, "m", "g", transferId, mockRequestId);
        await cACCU.setKYC(addr1.address, true);
        await expect(cACCU.connect(addr1).redeem(batchId, amount, transferId, mockRequestId))
            .to.emit(cACCU, "BatchRedeemed")
            .withArgs(batchId, addr1.address, amount, projectID);
        expect(await cACCU.balanceOf(addr1.address, batchId)).to.equal(90);
    });

    it("Should revert mintBatch if ANREU not confirmed", async function () {
        const projectID = "project1";
        const vintage = 2023;
        const methodology = "method1";
        const geoHash = "geo1";
        const transferId = "transfer1";
        const mockRequestId = ethers.utils.formatBytes32String("mock");

        // Do not set confirmation
        await expect(cACCU.mintBatch(addr1.address, 1, 100, projectID, vintage, methodology, geoHash, transferId, mockRequestId))
            .to.be.revertedWith("ANREU transfer not confirmed");
    });

    it("Should revert redeem if not confirmed", async function () {
        const batchId = 1;
        const amount = 10;
        const projectID = "p";
        const transferId = "transfer1";
        const mockRequestId = ethers.utils.formatBytes32String("mock");
        await oracleConsumer.setConfirmationForTest(mockRequestId, true);
        await cACCU.mintBatch(addr1.address, batchId, 100, projectID, 2000, "m", "g", transferId, mockRequestId);
        await cACCU.setKYC(addr1.address, true);

        const redeemRequestId = ethers.utils.formatBytes32String("mock2");
        // Do not set confirmation for redeem
        await expect(cACCU.connect(addr1).redeem(batchId, amount, transferId, redeemRequestId))
            .to.be.revertedWith("Retirement not confirmed");
    });

    it("Should request ANREU confirmation from oracle", async function () {
        const transferId = "transfer1";
        const source = "return true;"; // Mock JavaScript source
        const requestId = await oracleConsumer.callStatic.requestANREUConfirmation(transferId, source);
        expect(requestId).to.not.be.equal(ethers.constants.HashZero);
    });
});
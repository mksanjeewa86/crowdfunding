const { expect } = require("chai");
const { ethers } = require("hardhat");
const { SignerWithAddress } = require("@nomiclabs/hardhat-ethers/dist/src/signer-with-address");

describe("Project", () => {
  let account1 =  SignerWithAddress;
  let account2 =  SignerWithAddress;

  beforeEach(async () => {
    const [address1, address2] = await ethers.getSigners();
    account1 = address1;
    account2 = address2;
  });

  const deployProject = async () => {
    const contractFactory = await ethers.getContractFactory("Project", account1);
    const contract = await contractFactory.deploy(account1.address, ethers.utils.parseEther("10"));
    await contract.deployed();
    return contract;
  };

  describe("state variables", () => {
    it("should be account owner", async () => {
      const project = await deployProject();
      const creator = await project.creator();
      expect(creator).to.equal(account1.address);
    });
    it("goal should be 10", async () => {
      const project = await deployProject();
      const amountGoal = await project.amountGoal();
      expect(amountGoal).to.equal(ethers.utils.parseEther("10"));
    });
    it("opening state should be 0", async () => {
      const project = await deployProject();
      const state = await project.state();
      expect(state).to.equal(0);
    });
    it("opening balance should be 0", async () => {
      const project = await deployProject();
      const currentBalance = await project.currentBalance();
      expect(currentBalance).to.equal(0);
    });
    it("expire timestamp should be after 30 days", async () => {
      const currentTimestamp = Date.now();
      await ethers.provider.send("evm_setNextBlockTimestamp", [
        currentTimestamp,
      ]);
      const project = await deployProject();
      const expireTimestamp = await project.expireTimestamp();
      expect(expireTimestamp).to.equal(`${currentTimestamp + 60 * 60 * 24 * 30}`);
    });
  });
  describe("contributions", () => {
    it("normal contribution and also owner can contribute to project", async () => {
      const project = await deployProject();
      await project.connect(account1).contribute({ value: ethers.utils.parseEther("0.1") });
      const currentBalance = await project.currentBalance();
      expect(currentBalance).to.equal(ethers.utils.parseEther("0.1"));
    });
    it("contributions less than minimum amount", async () => {
      const project = await deployProject();
      await expect(
        project.connect(account1).contribute({ value: ethers.utils.parseEther("0.001") })
      ).to.be.revertedWith("minimum contribution is 0.01 ether");
      const currentBalance = await project.currentBalance();
      expect(currentBalance).to.equal(ethers.utils.parseEther("0"));
    });
    it("contributions less than minimum amount is not add to the project balance", async () => {
      const project = await deployProject();
      await project.connect(account1).contribute({ value: ethers.utils.parseEther("0.1") });
      await expect(
        project.connect(account2).contribute({ value: ethers.utils.parseEther("0.001") })
      ).to.be.revertedWith("minimum contribution is 0.01 ether");
      const currentBalance = await project.currentBalance();
      expect(currentBalance).to.equal(ethers.utils.parseEther("0.1"));
    });
    it("emit FundingReceived event", async () => {
      const project = await deployProject();
      await expect(project.connect(account1).contribute({ value: ethers.utils.parseEther("0.1") })
      ).to.emit(project, "FundingReceived").withArgs(account1.address, ethers.utils.parseEther("0.1"));
    });
    it("contribute after project successful", async () => {
      const project = await deployProject();
      await project.connect(account1).contribute({ value: ethers.utils.parseEther("10") });
      await expect(
        project.connect(account1).contribute({ value: ethers.utils.parseEther("0.01") })
      ).to.be.revertedWith("project is not active");
    });
    it("multiple contributions by multiple users", async () => {
      const project = await deployProject();
      await project.connect(account1).contribute({ value: ethers.utils.parseEther("0.01") });
      await project.connect(account2).contribute({ value: ethers.utils.parseEther("1") });
      const currentBalance = await project.currentBalance();
      expect(currentBalance).to.equal(ethers.utils.parseEther("1.01"));
    });
    it("multiple contributions by same user", async () => {
      const project = await deployProject();
      await project.connect(account1).contribute({ value: ethers.utils.parseEther("0.01") });
      await project.connect(account1).contribute({ value: ethers.utils.parseEther("1") });
      const currentBalance = await project.currentBalance();
      expect(currentBalance).to.equal(ethers.utils.parseEther("1.01"));
    });
  });
  describe("cancel project", () => {
    it("should state be cancelled", async () => {
      const project = await deployProject();
      await project.connect(account1).cancelProject();
      const state = await project.state();
      expect(state).to.equal(1);
    });
    it("cannot cancel the cancelled the project other than project creator", async () => {
      const project = await deployProject();
      await expect(
        project.connect(account2).cancelProject()
      ).to.be.revertedWith("only project creator can run this action");
    });
    it("contribution after cancel the project", async () => {
      const project = await deployProject();
      await project.connect(account1).cancelProject();
      await expect(
        project.connect(account2).contribute({ value: ethers.utils.parseEther("0.01") })
      ).to.be.revertedWith("project is not active");
    });
  });
  describe("withdraw", () => {
    it("withdraw the project balance by project owner and final balance should be 0", async () => {
      const project = await deployProject();
      await project.connect(account2).contribute({ value: ethers.utils.parseEther("11") });
      const state = await project.state();
      expect(state).to.equal(3);
      await project.connect(account1).payOut({ value: ethers.utils.parseEther("11") });
      const currentBalance = await project.currentBalance();
      expect(currentBalance).to.equal(ethers.utils.parseEther("0"));
    });
    it("withdraw the part of the project balance by project owner", async () => {
      const project = await deployProject();
      await project.connect(account2).contribute({ value: ethers.utils.parseEther("11") });
      const state = await project.state();
      expect(state).to.equal(3);
      await project.connect(account1).payOut({ value: ethers.utils.parseEther("5") });
      const currentBalance = await project.currentBalance();
      expect(currentBalance).to.equal(ethers.utils.parseEther("6"));
    });
    it("try to withdraw the more than the project balance by project owner", async () => {
      const project = await deployProject();
      await project.connect(account2).contribute({ value: ethers.utils.parseEther("11") });
      const state = await project.state();
      expect(state).to.equal(3);
      await expect(
        project.connect(account1).payOut({ value: ethers.utils.parseEther("15") })
      ).to.be.revertedWith("cannot withdraw this amount");
    });
    it("try to withdraw by other than the project owner and final balance should not changed", async () => {
      const project = await deployProject();
      await project.connect(account2).contribute({ value: ethers.utils.parseEther("11") });
      const state = await project.state();
      expect(state).to.equal(3);
      await expect(
        project.connect(account2).payOut({ value: ethers.utils.parseEther("5") })
      ).to.be.revertedWith("only project creator can run this action");
      const currentBalance = await project.currentBalance();
      expect(currentBalance).to.equal(ethers.utils.parseEther("11"));
    });
    it("try to withdraw from active project", async () => {
      const project = await deployProject();
      await project.connect(account2).contribute({ value: ethers.utils.parseEther("5") });
      const state = await project.state();
      expect(state).to.equal(0);
      await expect(
        project.connect(account1).payOut({ value: ethers.utils.parseEther("5") })
      ).to.be.revertedWith("project is not successful");
    });
    it("try to withdraw from cancelled project", async () => {
      const project = await deployProject();
      await project.connect(account2).contribute({ value: ethers.utils.parseEther("5") });
      await project.connect(account1).cancelProject();
      const state = await project.state();
      expect(state).to.equal(1);
      await expect(
        project.connect(account1).payOut({ value: ethers.utils.parseEther("5") })
      ).to.be.revertedWith("project is not successful");
      const currentBalance = await project.currentBalance();
      expect(currentBalance).to.equal(ethers.utils.parseEther("5"));
    });
    it("emit Withdraw event", async () => {
      const project = await deployProject();
      await project.connect(account2).contribute({ value: ethers.utils.parseEther("11") });
      await expect(project.connect(account1).payOut({ value: ethers.utils.parseEther("5") })
      ).to.emit(project, "Withdraw").withArgs(account1.address, ethers.utils.parseEther("5"));
    });
  });
  describe("refund", () => {
    it("try to refund from successful project", async () => {
      const project = await deployProject();
      await project.connect(account2).contribute({ value: ethers.utils.parseEther("5") });
      await project.connect(account1).contribute({ value: ethers.utils.parseEther("6") });
      const state = await project.state();
      expect(state).to.equal(3);
      await expect(
        project.connect(account1).getRefund()
      ).to.be.revertedWith("project is not canceled or expired");
    });
    it("refund from cancelled project", async () => {
      const project = await deployProject();
      await project.connect(account2).contribute({ value: ethers.utils.parseEther("5") });
      await project.connect(account1).contribute({ value: ethers.utils.parseEther("3") });
      await project.connect(account1).cancelProject();
      const state = await project.state();
      expect(state).to.equal(1);
      await project.connect(account1).getRefund();
      const currentBalance = await project.currentBalance();
      expect(currentBalance).to.equal(ethers.utils.parseEther("5"));
    });
    it("try to refund without contribution", async () => {
      const project = await deployProject();
      await project.connect(account2).contribute({ value: ethers.utils.parseEther("5") });
      await project.connect(account1).cancelProject();
      await expect(
        project.connect(account1).getRefund()
      ).to.be.revertedWith("there is nothing to refund");
      const currentBalance = await project.currentBalance();
      expect(currentBalance).to.equal(ethers.utils.parseEther("5"));
    });
    it("emit Refund event", async () => {
      const project = await deployProject();
      await project.connect(account1).contribute({ value: ethers.utils.parseEther("4") });
      await project.connect(account1).cancelProject();
      await expect(project.connect(account1).getRefund()
      ).to.emit(project, "Refund").withArgs(account1.address, ethers.utils.parseEther("4"));
    });
  });
  describe("NFT", () => {
    it("contribute more than 1 ether and try to mint NFT", async () => {
      const project = await deployProject();
      await project.connect(account1).contribute({ value: ethers.utils.parseEther("1.4") });
      await project.connect(account1).mintNFT();
      const accountNFTBalance = await project.balanceOf(account1.address);
      expect(accountNFTBalance).to.equal(1);
    });
    it("mint multiple NFTs", async () => {
      const project = await deployProject();
      await project.connect(account1).contribute({ value: ethers.utils.parseEther("2.4") });
      await project.connect(account1).mintNFT();
      await project.connect(account1).mintNFT();
      const accountNFTBalance = await project.balanceOf(account1.address);
      expect(accountNFTBalance).to.equal(2);
    });
    it("mint multiple NFTs more than available", async () => {
      const project = await deployProject();
      await project.connect(account1).contribute({ value: ethers.utils.parseEther("2.4") });
      await project.connect(account1).mintNFT();
      await project.connect(account1).mintNFT();
      await expect(
        project.connect(account1).mintNFT()
      ).to.be.revertedWith("mintable NFTs not available");
      const accountNFTBalance = await project.balanceOf(account1.address);
      expect(accountNFTBalance).to.equal(2);
    });
    it("contribute less than 1 ether and try to mint NFT", async () => {
      const project = await deployProject();
      await project.connect(account2).contribute({ value: ethers.utils.parseEther("0.01") });
      await expect(
        project.connect(account2).mintNFT()
      ).to.be.revertedWith("mintable NFTs not available");
      const accountNFTBalance = await project.balanceOf(account2.address);
      expect(accountNFTBalance).to.equal(0);
    });
    it("contribute multiple times more than 1 ether and try to mint NFT", async () => {
      const project = await deployProject();
      await project.connect(account2).contribute({ value: ethers.utils.parseEther("0.5") });
      await project.connect(account2).contribute({ value: ethers.utils.parseEther("0.6") });
      await project.connect(account2).mintNFT();
      const accountNFTBalance = await project.balanceOf(account2.address);
      expect(accountNFTBalance).to.equal(1);
    });
    it("try to mint NFT without contribution", async () => {
      const project = await deployProject();
      await expect(
        project.connect(account2).mintNFT()
      ).to.be.revertedWith("mintable NFTs not available");
      const accountNFTBalance = await project.balanceOf(account2.address);
      expect(accountNFTBalance).to.equal(0);
    });
    it("still mintable after cancel the project", async () => {
      const project = await deployProject();
      await project.connect(account2).contribute({ value: ethers.utils.parseEther("1.5") });
      await project.connect(account1).cancelProject();
      await project.connect(account2).mintNFT();
      const accountNFTBalance = await project.balanceOf(account2.address);
      expect(accountNFTBalance).to.equal(1);
    });
  });
});

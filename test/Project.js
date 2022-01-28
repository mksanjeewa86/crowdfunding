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

  const deployContract = async (account, title, description, goal) => {
    const contractFactory = await ethers.getContractFactory("Project");
    const contract = await contractFactory.deploy(account ?? account1.address, title ?? "Title", description ?? "description", goal ?? ethers.utils.parseEther("10"));
    return contract;
  };

  describe("deploy the project", () => {
    it("check state variables", async () => {
      const project = await deployContract();

      const projectCreator = await project.getCreator();
      expect(projectCreator).to.equal(account1.address);

      const projectGoal = await project.getAmountGoal();
      expect(projectGoal).to.equal(ethers.utils.parseEther("10"));

      const projectCurrentBalance = await project.getCurrentBalance();
      expect(projectCurrentBalance).to.equal(0);

      const projectTitle = await project.getTitle();
      expect(projectTitle).to.equal("Title");

      const projectDesc = await project.getDescription();
      expect(projectDesc).to.equal("description");

      const projectCompleteAt = await project.getCompleteAt();
      expect(projectCompleteAt).to.equal(`0`);

      // await project.cancelProject();
      const projectState = await project.getState();
      expect(projectState).to.equal(0);

    });
  });
  describe("receive contribution", () => {
    it("recieve under minimum contribution", async () => {
      const project = await deployContract(account1.address, "title", "description", ethers.utils.parseEther("10"));
      let error;
      try {
        await project.contribute(ethers.utils.parseEther("0.001"));
      } catch (err) {
        error = err;
      }
      expect(String(error).indexOf("minimum contribution is 0.01 ether") > -1).to.equal(true);
    });
    it("recieve normal contribution and project balance", async () => {
      const project = await deployContract(account1.address, "title", "description", ethers.utils.parseEther("10"));
      await project.contribute(ethers.utils.parseEther("0.01"));

      const projectCurrentBalance = await project.getCurrentBalance();
      expect(projectCurrentBalance).to.equal(ethers.utils.parseEther("0.01"));
    });
    it("recieve normal contribution and project state", async () => {
      const project = await deployContract(account1.address, "title", "description", ethers.utils.parseEther("10"));
      await project.contribute(ethers.utils.parseEther("0.01"));

      const projectState = await project.getState();
      expect(projectState).to.equal(0);
    });
    it("recieve normal contribution and project state", async () => {
      const project = await deployContract(account1.address, "title", "description", ethers.utils.parseEther("10"));
      await project.contribute(ethers.utils.parseEther("0.01"));

      const projectState = await project.getState();
      expect(projectState).to.equal(0);
    });
  });
  describe("cancel the project", () => {
    it("cancel project and project state", async () => {
      const project = await deployContract(account1.address, "title", "description", ethers.utils.parseEther("10"));
      await project.cancelProject();

      const projectState = await project.getState();
      expect(projectState).to.equal(1);
    });
    it("cancel project and receive contribution", async () => {
      const project = await deployContract(account1.address, "title", "description", ethers.utils.parseEther("10"));
      let error;
      try {
        await project.cancelProject();
        await project.contribute(ethers.utils.parseEther("0.01"));
      } catch (err) {
        error = err;
      }
      expect(String(error).indexOf("check the current state before calling") > -1).to.equal(true);
    });
  });
  describe("complete the project", () => {
    it("complete project and project state", async () => {
      const project = await deployContract(account1.address, "title", "description", ethers.utils.parseEther("10"));
      await project.contribute(ethers.utils.parseEther("10"));

      const projectState = await project.getState();
      expect(projectState).to.equal(2);
    });
    it("complete project and receive contribution", async () => {
      const project = await deployContract(account1.address, "title", "description", ethers.utils.parseEther("10"));
      let error;
      try {
        await project.contribute(ethers.utils.parseEther("10"));
        await project.contribute(ethers.utils.parseEther("0.01"));
      } catch (err) {
        error = err;
      }
      expect(String(error).indexOf("check the current state before calling") > -1).to.equal(true);
    });
    describe("NFT", () => {
      it("mint NFT", async () => {
        const project = await deployContract(account1.address, "title", "description", ethers.utils.parseEther("10"));
        await project.contribute(ethers.utils.parseEther("5"));
  
        await project.connect(account1).mintNFT();
        const balanceOfNFTs = await project.balanceOf(account1.address);
        expect(balanceOfNFTs).to.equal(1);
      });
    });
  });
});

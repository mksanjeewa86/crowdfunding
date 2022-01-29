const { expect } = require("chai");
const { ethers } = require("hardhat");
const { SignerWithAddress } = require("@nomiclabs/hardhat-ethers/dist/src/signer-with-address");

describe("Project Factory", () => {
  let account =  SignerWithAddress;

  beforeEach(async () => {
    const [address] = await ethers.getSigners();
    account = address;
  });

  const deployProjectFactory = async () => {
    const contractFactory = await ethers.getContractFactory("ProjectFactory", account);
    const contract = await contractFactory.deploy();
    await contract.deployed();
    return contract;
  };

  describe("deploy", () => {
    it("deploy success", async () => {
      const project = await deployProjectFactory();
      const startProject = project.startProject(account.address, ethers.utils.parseEther("0.1"));
      expect(startProject).to.emit("Created");
    });
  });
});

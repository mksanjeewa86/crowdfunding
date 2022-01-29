const main = async () => {
  const ProjectFactory = await hre.ethers.getContractFactory("ProjectFactory");
  const project = await ProjectFactory.deploy();
  await project.deployed();
  console.log("ProjectFactory deployed to:", project.address);
}

const runMain = () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

runmain();

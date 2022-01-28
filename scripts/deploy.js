const main = async () => {
  const Greeter = await hre.ethers.getContractFactory("Greeter");
  const greeter = await Greeter.deploy("Greeter");
  await greeter.deployed();
  console.log("Greeter deployed to:", greeter.address);
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

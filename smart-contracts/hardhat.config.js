require('dotenv').config({path: "../.env"});
require("@nomiclabs/hardhat-waffle");
require("hardhat-deploy");
require("hardhat-deploy-ethers");


// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      tags: ["test", "local"],
      // chainId: 31337
    },
    polygonMumbai: {
      url: process.env.ALCHEMY_POLYGON_MUMBAI_RPC_URL,
      accounts: {
        mnemonic: process.env.DEV_MNEMONIC
      }
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    feeCollector:{
      default: 0,
    }
  },
  solidity: {
    version: "0.8.11",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};

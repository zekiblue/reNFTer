module.exports = async ({
  getNamedAccounts,
  deployments,
}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  // TODO: Move args to config or .env eventually
  await deploy('wNFT', {
    from: deployer,
    // gasLimit: 4000000,
    args: [],
    log: true
  });
};
module.exports.tags = ['wNFT'];

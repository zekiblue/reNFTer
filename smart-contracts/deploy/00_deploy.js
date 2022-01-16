module.exports = async ({
  getNamedAccounts,
  deployments,
}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  // TODO: Move args to config or .env eventually
  const deployResult = await deploy('wNFT', {
    from: deployer,
    // gasLimit: 4000000,
    args: [],
    log: true
  });

  // console.log("deployResult", deployResult)

  await deploy('Renfter', {
    from: deployer,
    // gasLimit: 4000000,
    args: [deployResult.address],
    log: true
  });
};
module.exports.tags = ['wNFT', 'Renfter'];

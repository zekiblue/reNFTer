const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("wNFT", function () {
  let wrappedNFT;
  let wNFT;
  let ERC721NFT;
  let erc721NFT;
    

  beforeEach(async () => {
    wrappedNFT = await ethers.getContractFactory("wNFT");
    wNFT = await wrappedNFT.deploy();
    await wNFT.deployed();

    ERC721NFT = await ethers.getContractFactory("ERC721NFT");
    erc721NFT = await ERC721NFT.deploy("ERC721", "erc721", "erc721.com/");
    await erc721NFT.deployed();
  });

  it("Should create wNFT contract", async () => {
    const wrappedNFT = await ethers.getContractFactory("wNFT");
    const wNFT = await wrappedNFT.deploy();
    await wNFT.deployed();

    expect(await wNFT.name()).to.equal("Wrapped NFTs");
    expect(await wNFT.symbol()).to.equal("wNFT");
  });

  it("Should allow MINTER to min new token", async () => {
    const [owner, account1] = await ethers.getSigners();

    const MINTER_ROLE = ethers.utils.id("MINTER_ROLE");
    await wNFT.grantRole(MINTER_ROLE, owner.address);
    // Intentionally using EOA (account1) address instead of contract address
    // just not to bother. In real life tjhis should be contract address.
    await wNFT.mint(owner.address, account1.address, 1);

    expect(await wNFT.ownerOf(1)).to.be.equal(owner.address);
    await expect(wNFT.connect(account1).mint(owner.address, account1.address, 1)).to.be.reverted;
    await expect(wNFT.mint(owner.address, ethers.constants.AddressZero, 1)).to.be.revertedWith("Invalid contract address");
  });

  it("Should return correct token URIs for wrapped tokens", async () => {
    const [owner] = await ethers.getSigners();

    // In beforeEach
    await erc721NFT.mint(owner.address, 1);
    const erc721tokenUrl = await erc721NFT.tokenURI(1);

    const ERC1155NFT = await ethers.getContractFactory("ERC1155NFT");
    const erc1155NFT = await ERC1155NFT.deploy("erc1155.com/{id}.json");
    await erc1155NFT.deployed();

    await erc1155NFT.mint(owner.address, 1);
    const erc1155tokenUrl = await erc1155NFT.uri(1);

    const MINTER_ROLE = ethers.utils.id("MINTER_ROLE");
    await wNFT.grantRole(MINTER_ROLE, owner.address);
    await wNFT.mint(owner.address, erc721NFT.address, 1);
    await wNFT.mint(owner.address, erc1155NFT.address, 1);
    const wERC721TokenUrl = await wNFT.tokenURI(1);
    const wERC1155TokenUrl = await wNFT.tokenURI(2);

    expect(wERC721TokenUrl).to.be.eq(erc721tokenUrl);
    expect(erc1155tokenUrl).to.be.eq(wERC1155TokenUrl);
  });

  it("Should set beneficiary on token transfer, while preserving info about real owner", async () => {
    const [owner, account1] = await ethers.getSigners();

    await erc721NFT.mint(owner.address, 1);

    const MINTER_ROLE = ethers.utils.id("MINTER_ROLE");
    await wNFT.grantRole(MINTER_ROLE, owner.address);
    await wNFT.mint(owner.address, erc721NFT.address, 1);

    const beneficiaryAfterMint = await wNFT.getBeneficiary(erc721NFT.address, 1);
    await wNFT.transferFrom(owner.address, account1.address, 1);
    const beneficiaryAfterTransfer = await wNFT.getBeneficiary(erc721NFT.address, 1);

    expect(beneficiaryAfterMint).to.be.eq(owner.address);
    expect(beneficiaryAfterTransfer).to.be.eq(account1.address);
  });

  it("Should return original token data", async () => {
    const [owner, account1] = await ethers.getSigners();

    await erc721NFT.mint(owner.address, 1);

    const MINTER_ROLE = ethers.utils.id("MINTER_ROLE");
    await wNFT.grantRole(MINTER_ROLE, owner.address);
    await wNFT.mint(owner.address, erc721NFT.address, 1);

    const [superOwner, contractAddress, externalTokenId] = await wNFT.getOriginalTokenData(1);

    expect(superOwner).to.be.eq(owner.address);
    expect(contractAddress).to.be.eq(erc721NFT.address);
    expect(externalTokenId).to.be.eq(1);
  });

  it("Should delete all data on token burn", async () => {
    const [owner, account1] = await ethers.getSigners();

    await erc721NFT.mint(owner.address, 1);

    const MINTER_ROLE = ethers.utils.id("MINTER_ROLE");
    await wNFT.grantRole(MINTER_ROLE, owner.address);
    await wNFT.mint(owner.address, erc721NFT.address, 1);

    await expect(wNFT.connect(account1).burn(1)).to.be.revertedWith("Not allowed");
    
    const beneficiaryBeforeBurn = await wNFT.getBeneficiary(erc721NFT.address, 1);
    const originalTokenDataBeforeBurn = await wNFT.getOriginalTokenData(1);

    await wNFT.burn(1);

    const beneficiaryAfterBurn = await wNFT.getBeneficiary(erc721NFT.address, 1);
    const originalTokenDataAfterBurn = await wNFT.getOriginalTokenData(1);

    await expect(wNFT.ownerOf(1)).to.be.reverted;
    expect(beneficiaryBeforeBurn).to.be.eq(owner.address);
    expect(beneficiaryAfterBurn).to.be.eq(ethers.constants.AddressZero);
    expect(originalTokenDataBeforeBurn.superOwner).to.be.eq(owner.address);
    expect(originalTokenDataBeforeBurn.contractAddress).to.be.eq(erc721NFT.address);
    expect(originalTokenDataBeforeBurn.externalTokenId).to.be.eq(1);
    expect(originalTokenDataAfterBurn.superOwner).to.be.eq(ethers.constants.AddressZero);
    expect(originalTokenDataAfterBurn.contractAddress).to.be.eq(ethers.constants.AddressZero);
    expect(originalTokenDataAfterBurn.externalTokenId).to.be.eq(0);
  });
});

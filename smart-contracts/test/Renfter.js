const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Renfter", function () {
  let Renfter, renfter, wrappedNFT, wNFT, ERC721NFT, erc721NFT, ERC1155NFT, erc1155NFT;
    
  beforeEach(async () => {
    wrappedNFT = await ethers.getContractFactory("wNFT");
    wNFT = await wrappedNFT.deploy();
    await wNFT.deployed();

    Renfter = await ethers.getContractFactory("Renfter");
    renfter = await Renfter.deploy(wNFT.address);
    await renfter.deployed();

    const MINTER_ROLE = ethers.utils.id("MINTER_ROLE");
    const BURNER_ROLE = ethers.utils.id("BURNER_ROLE");
    const SUPERADMIN_ROLE = ethers.utils.id("SUPERADMIN_ROLE");
    await wNFT.grantRole(MINTER_ROLE, renfter.address);
    await wNFT.grantRole(BURNER_ROLE, renfter.address);
    await wNFT.grantRole(SUPERADMIN_ROLE, renfter.address);

    ERC721NFT = await ethers.getContractFactory("ERC721NFT");
    erc721NFT = await ERC721NFT.deploy("ERC721", "erc721", "erc721.com/");
    await erc721NFT.deployed();

    ERC1155NFT = await ethers.getContractFactory("ERC1155NFT");
    erc1155NFT = await ERC1155NFT.deploy("erc1155.com/");
    await erc1155NFT.deployed();
  });

  it("Should wrap NFTs", async () => {
    const [owner, account1] = await ethers.getSigners();

    await erc721NFT.mint(owner.address, 1);
    await erc1155NFT.mint(owner.address, 1);

    const erc721NFTOwnerBeforeWrap = await erc721NFT.ownerOf(1);
    const erc1155NFTOwnerBalanceBeforeWrap = await erc1155NFT.balanceOf(owner.address, 1);
    const erc1155NFTRenfterBalanceBeforeWrap = await erc1155NFT.balanceOf(renfter.address, 1);

    await expect(renfter.wrap(erc721NFT.address, 1)).to.be.revertedWith("Approve is missing");
    await expect(renfter.wrap(erc1155NFT.address, 1)).to.be.revertedWith("Approve is missing");

    await erc721NFT.setApprovalForAll(renfter.address, true);
    await erc1155NFT.setApprovalForAll(renfter.address, true);

    await renfter.wrap(erc721NFT.address, 1);
    await renfter.wrap(erc1155NFT.address, 1);

    const erc721NFTOwnerAfterWrap = await erc721NFT.ownerOf(1);
    const erc1155NFTOwnerBalanceAfterWrap = await erc1155NFT.balanceOf(owner.address, 1);
    const erc1155NFTRenfterBalanceAfterWrap = await erc1155NFT.balanceOf(renfter.address, 1);
    
    await erc721NFT.mint(owner.address, 2);
    await erc1155NFT.mint(owner.address, 2);
    
    expect(erc721NFTOwnerBeforeWrap).to.be.eq(owner.address);
    expect(erc1155NFTOwnerBalanceBeforeWrap).to.be.eq(1);
    expect(erc1155NFTRenfterBalanceBeforeWrap).to.be.eq(0);
    expect(erc721NFTOwnerAfterWrap).to.be.eq(renfter.address);
    expect(erc1155NFTOwnerBalanceAfterWrap).to.be.eq(0);
    expect(erc1155NFTRenfterBalanceAfterWrap).to.be.eq(1);
    await expect(renfter.wrap(owner.address, 1)).to.be.revertedWith("Invalid contract type");
    await expect(renfter.connect(account1).wrap(erc721NFT.address, 2)).to.be.revertedWith("Not an owner");
    await expect(renfter.connect(account1).wrap(erc1155NFT.address, 2)).to.be.revertedWith("Not an owner");
  });

  it("Should allow original owner to offer wrapped NFTs for rent", async () => {
    const [owner, account1] = await ethers.getSigners();

    await erc721NFT.mint(owner.address, 1);
    await erc1155NFT.mint(owner.address, 1);
    await erc721NFT.setApprovalForAll(renfter.address, true);
    await erc1155NFT.setApprovalForAll(renfter.address, true);
    await renfter.wrap(erc721NFT.address, 1);
    await renfter.wrap(erc1155NFT.address, 1);

    const pricePerDay = ethers.utils.parseEther("1");

    await expect(renfter.connect(account1).offerForRent(1, pricePerDay)).to.be.revertedWith("Not allowed");
    await expect(renfter.connect(account1).offerForRent(2, pricePerDay)).to.be.revertedWith("Not allowed");
    await expect(renfter.offerForRent(1, 0)).to.be.revertedWith("Invalid price value");
    await expect(renfter.offerForRent(2, 0)).to.be.revertedWith("Invalid price value");

    await renfter.offerForRent(1, pricePerDay);
    await renfter.offerForRent(2, pricePerDay);

    const nftForRent1 = await renfter.nftsForRenting(1);
    const nftForRent2 = await renfter.nftsForRenting(2);

    expect(nftForRent1).to.be.eq(pricePerDay);
    expect(nftForRent2).to.be.eq(pricePerDay);

    await expect(renfter.offerForRent(1, pricePerDay)).to.be.revertedWith("Already offered");
    await expect(renfter.offerForRent(2, pricePerDay)).to.be.revertedWith("Already offered");

    const twoDays = 60 * 60 * 48;

    await renfter.connect(account1).rent(1, twoDays, {value: pricePerDay.mul(2)});
    await renfter.connect(account1).rent(2, twoDays, {value: pricePerDay.mul(2)});

    await expect(renfter.offerForRent(1, pricePerDay)).to.be.revertedWith("Already rented");
    await expect(renfter.offerForRent(2, pricePerDay)).to.be.revertedWith("Already rented");
  });

  it("Should allow renting wrapped NFTs that are offered for rent", async () => {
    const [owner, account1, account2] = await ethers.getSigners();

    await erc721NFT.mint(owner.address, 1);
    await erc1155NFT.mint(owner.address, 1);
    await erc721NFT.mint(owner.address, 2);
    await erc1155NFT.mint(owner.address, 2);
    await erc721NFT.setApprovalForAll(renfter.address, true);
    await erc1155NFT.setApprovalForAll(renfter.address, true);
    await renfter.wrap(erc721NFT.address, 1);
    await renfter.wrap(erc1155NFT.address, 1);
    await renfter.wrap(erc721NFT.address, 2);
    await renfter.wrap(erc1155NFT.address, 2);

    const pricePerDay = ethers.utils.parseEther("1");

    await renfter.offerForRent(1, pricePerDay);
    await renfter.offerForRent(2, pricePerDay);

    const twoDays = 60 * 60 * 48;
    const twelveHours = 60 * 60 * 12;

    await expect(renfter.connect(account1).rent(1, twelveHours, {value: pricePerDay.mul(2)})).to.be.revertedWith("Min one day to rent");
    await expect(renfter.connect(account1).rent(2, twelveHours, {value: pricePerDay.mul(2)})).to.be.revertedWith("Min one day to rent");
    await expect(renfter.connect(account1).rent(1, twoDays, {value: pricePerDay})).to.be.revertedWith("Not enough funds");
    await expect(renfter.connect(account1).rent(2, twoDays, {value: pricePerDay})).to.be.revertedWith("Not enough funds");

    const token1BeneficiaryBeforeRenting = await wNFT.getBeneficiary(erc721NFT.address, 1);
    const token2BeneficiaryBeforeRenting = await wNFT.getBeneficiary(erc1155NFT.address, 1);
    await renfter.connect(account1).rent(1, twoDays, {value: pricePerDay.mul(2)});
    await renfter.connect(account1).rent(2, twoDays, {value: pricePerDay.mul(2)});
    const token1BeneficiaryAfterRenting = await wNFT.getBeneficiary(erc721NFT.address, 1);
    const token2BeneficiaryAfterRenting = await wNFT.getBeneficiary(erc1155NFT.address, 1);

    expect(token1BeneficiaryBeforeRenting).to.be.eq(owner.address);
    expect(token2BeneficiaryBeforeRenting).to.be.eq(owner.address);
    expect(token1BeneficiaryAfterRenting).to.be.eq(account1.address);
    expect(token2BeneficiaryAfterRenting).to.be.eq(account1.address);
    await expect(renfter.connect(account2).rent(1, twoDays, {value: pricePerDay.mul(2)})).to.be.revertedWith("Already rented");
    await expect(renfter.connect(account2).rent(2, twoDays, {value: pricePerDay.mul(2)})).to.be.revertedWith("Already rented");
    await expect(renfter.connect(account2).rent(3, twoDays, {value: pricePerDay.mul(2)})).to.be.revertedWith("Not renting");
    await expect(renfter.connect(account2).rent(4, twoDays, {value: pricePerDay.mul(2)})).to.be.revertedWith("Not renting");
  });

  it("Should unwarp NFTs", async () => {
    const [owner, account1] = await ethers.getSigners();

    await erc721NFT.mint(owner.address, 1);
    await erc1155NFT.mint(owner.address, 1);
    await erc1155NFT.mint(owner.address, 2);
    await erc721NFT.setApprovalForAll(renfter.address, true);
    await erc1155NFT.setApprovalForAll(renfter.address, true);
    await renfter.wrap(erc721NFT.address, 1);
    await renfter.wrap(erc1155NFT.address, 1);
    await renfter.wrap(erc1155NFT.address, 2);


    const pricePerDay = ethers.utils.parseEther("1");
    const twoDays = 60 * 60 * 48;

    await renfter.offerForRent(1, pricePerDay);
    await renfter.offerForRent(3, pricePerDay);
    await renfter.connect(account1).rent(3, twoDays, {value: pricePerDay.mul(2)});

    await expect(renfter.connect(account1).unwrap(1)).to.be.revertedWith("Not allowed");
    await expect(renfter.connect(account1).unwrap(2)).to.be.revertedWith("Not allowed");
    await expect(renfter.connect(account1).unwrap(3)).to.be.revertedWith("Not allowed");
    await expect(renfter.unwrap(3)).to.be.revertedWith("Rent duration period isn't over");

    const erc721NFTOwnerBeforeUnwrap = await erc721NFT.ownerOf(1);
    const erc1155NFTRenterBalanceBeforeUnwrap = await erc1155NFT.balanceOf(renfter.address, 1);
    const token1OwnerBeforeUnwarp = await wNFT.ownerOf(1);
    const token2OwnerBeforeUnwarp = await wNFT.ownerOf(1);

    await renfter.unwrap(1);
    await renfter.unwrap(2);

    const erc721NFTOwnerAfterUnwrap = await erc721NFT.ownerOf(1);
    const erc1155NFTOwnerBalanceAfterUnwrap = await erc1155NFT.balanceOf(owner.address, 1);

    await expect(renfter.connect(account1).rent(1, twoDays, {value: pricePerDay.mul(2)})).to.be.revertedWith("Not renting");
    expect(erc721NFTOwnerBeforeUnwrap).to.be.eq(renfter.address);
    expect(erc1155NFTRenterBalanceBeforeUnwrap).to.be.eq(1);
    expect(token1OwnerBeforeUnwarp).to.be.eq(owner.address);
    expect(token2OwnerBeforeUnwarp).to.be.eq(owner.address);
    expect(erc721NFTOwnerAfterUnwrap).to.be.eq(owner.address);
    expect(erc1155NFTOwnerBalanceAfterUnwrap).to.be.eq(1);
    await expect(wNFT.ownerOf(1)).to.be.revertedWith("ERC721: owner query for nonexistent token");
    await expect(wNFT.ownerOf(2)).to.be.revertedWith("ERC721: owner query for nonexistent token");
  });
});

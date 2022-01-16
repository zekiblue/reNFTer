//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IwNFT.sol";

contract Renfter is ERC1155Holder, ERC721Holder, Ownable {
  IwNFT wNFT;

  struct RentedNFT {
    uint rentStartTimestamp;
    uint rentDuration;
    uint pricePerDay;
  }

  struct NFTForRenting {
    uint pricePerDay;
  }

  uint rentedNFTsCount;
  uint nftsForRentingCount;
  // wNFTId => RentedNFT
  mapping (uint256 => RentedNFT) public rentedNFTs;
  mapping (uint256 => NFTForRenting) public nftsForRenting;

  constructor(address _wNFTAddress) {
    wNFT = IwNFT(_wNFTAddress);
  }

  function setWNFT(address _contractAddress) public onlyOwner() {
    wNFT = IwNFT(_contractAddress);
  }

  // // TODO: Don't have time for this
  // function getAllRentedNFTS() public view returns(uint256[] memory rentedNFTsIds) {}

  //  // TODO: Don't have time for this
  // function getAllNFTSForRenting() public view returns(uint256[] memory rentedNFTsIds) {}

  function wrap(address _contractAddress, uint _tokenId) external returns(bool) {
    bool supportsERC721 = ERC165Checker.supportsInterface(_contractAddress, type(IERC721).interfaceId);
    bool supportsERC1155 = ERC165Checker.supportsInterface(_contractAddress, type(IERC1155).interfaceId);

    require(supportsERC721 || supportsERC1155, "Invalid contract type");

    if (supportsERC721) {
      require(IERC721(_contractAddress).ownerOf(_tokenId) == msg.sender, "Not an owner");
      require(IERC721(_contractAddress).isApprovedForAll(msg.sender, address(this)), "Approve is missing");

      IERC721(_contractAddress).safeTransferFrom(msg.sender, address(this), _tokenId);
      wNFT.mint(msg.sender, _contractAddress, _tokenId);
      return true;
    }

    require(IERC1155(_contractAddress).balanceOf(msg.sender, _tokenId) > 0, "Not an owner");
    require(IERC1155(_contractAddress).isApprovedForAll(msg.sender, address(this)), "Approve is missing");

    IERC1155(_contractAddress).safeTransferFrom(msg.sender, address(this), _tokenId, 1, "");

    wNFT.mint(msg.sender, _contractAddress, _tokenId);
    return true;
  }

  // Brun wrapped token, return original to real owner
  // Check if is rented before that 
  function unwrap(uint256 _tokenId) public returns(bool) {
    IwNFT.originalTokenData memory originalTokenData = wNFT.getOriginalTokenData(_tokenId);
    require(originalTokenData.superOwner == msg.sender, "Not allowed");

    RentedNFT memory rentedNFT = rentedNFTs[_tokenId];
    require(
      rentedNFT.rentStartTimestamp + rentedNFT.rentDuration < block.timestamp,
      "Rent duration period isn't over"
    );

    delete rentedNFTs[_tokenId];
    delete nftsForRenting[_tokenId];

    (address superOwner, address contractAddress, uint tokenId) = wNFT.burn(_tokenId);

    bool supportsERC721 = ERC165Checker.supportsInterface(contractAddress, type(IERC721).interfaceId);

    if (supportsERC721) {
      IERC721(contractAddress).transferFrom(address(this), superOwner, tokenId);
      return true;
    }

    IERC1155(contractAddress).safeTransferFrom(address(this), superOwner, tokenId, 1, "");
    return true;
  }

  function offerForRent(uint _tokenId, uint _pricePerDay) public {
    require(rentedNFTs[_tokenId].pricePerDay == 0, "Already rented");
    require(nftsForRenting[_tokenId].pricePerDay == 0, "Already offered");

    IwNFT.originalTokenData memory originalTokenData = wNFT.getOriginalTokenData(_tokenId);
    require(originalTokenData.superOwner == msg.sender, "Not allowed");
    require(_pricePerDay > 0, "Invalid price value");

    nftsForRenting[_tokenId].pricePerDay = _pricePerDay;
  }

  /// @param _tokenId Token which is going tobe rented
  /// @param _duration Rent duration in seconds
  function rent(uint _tokenId, uint _duration) public payable {
    uint priceForRent = nftsForRenting[_tokenId].pricePerDay;
    uint durationInDays = _duration / 60 / 60 / 24;

    require(rentedNFTs[_tokenId].pricePerDay == 0, "Already rented");
    require(priceForRent > 0, "Not renting");
    require(_duration > 1 days, "Min one day to rent");
    require(msg.value >= durationInDays * priceForRent, "Not enough funds");

    rentedNFTs[_tokenId].rentStartTimestamp = block.timestamp;
    rentedNFTs[_tokenId].rentDuration = _duration;
    rentedNFTs[_tokenId].pricePerDay = priceForRent;

    delete nftsForRenting[_tokenId];

    address currentOwner = wNFT.ownerOf(_tokenId);
    wNFT.transferFrom(currentOwner, msg.sender, _tokenId);
  }
}
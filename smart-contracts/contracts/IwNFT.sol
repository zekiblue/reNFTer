//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";


// TODO:
// - Change this to be ERC1155 instead of ERC721
interface IwNFT is IERC721 {
  struct originalTokenData {
    address superOwner;
    address contractAddress;
    uint256 externalTokenId;
  }
  
  // TODO: we should maybe check here also if tolen exists, and if _to is the owner before miniting
  /// @notice Mints new wrapped NFT
  /// @param _to Address that will own the token after minitng
  /// @param _contractAddress Address of the original contract whose token is being wrapped
  /// @param _tokenId Id of the token from origina contract that is going to be wrapped
  function mint(address _to, address _contractAddress, uint256 _tokenId) external;

  /// @notice Checks for type and returns original (non-wrapped) token URI
  /// @param _tokenId Wrapped token ID to retrieve original URI for. URI is return from original token contract
  function tokenURI(uint256 _tokenId) external view returns(string memory);

  /// @notice Checks beneficiary who can use token currently
  /// @param _contractAddress Original token contract address
  /// @param _tokenId Original token ID
  function getBeneficiary(address _contractAddress, uint _tokenId) external view returns(address);

  /// @notice Returns data about original tokenCounter
  /// @param _tokenId Wrapped token ID
  function getOriginalTokenData(uint _tokenId) external view returns(originalTokenData memory);

  // TODO: return original contract address, token id and superowner so we can use it in Refter contract
  // during unwrap and send it back to original user
  function burn(uint _tokenId) external returns(address, address, uint256);
}

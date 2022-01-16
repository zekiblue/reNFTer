//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.11;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// TODO:
// - Change this to be ERC1155 instead of ERC721
// - Prevent wrapping already wrapped NFTs
contract wNFT is ERC721, AccessControlEnumerable {
  using Counters for Counters.Counter;

  Counters.Counter tokenCounter;

  struct originalTokenData {
    address superOwner;
    address contractAddress;
    uint256 externalTokenId;
  }

  mapping(string => originalTokenData) private originalTokens;
  mapping(uint => string) private tokenIdsToOriginalTokenIds;
  mapping(string => address) private beneficiary;

  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
  bytes32 public constant SUPERADMIN_ROLE = keccak256("SUPERADMIN_ROLE");

  event CreateWrappedNFT(address indexed creator, address indexed contractAddress, uint originaId, uint indexed internalId);
  constructor() ERC721("Wrapped NFTs", "wNFT") {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
  }

  // TODO: we should maybe check here also if tolen exists, and if _to is the owner before miniting
  /// @notice Mints new wrapped NFT
  /// @param _to Address that will own the token after minitng
  /// @param _contractAddress Address of the original contract whose token is being wrapped
  /// @param _tokenId Id of the token from origina contract that is going to be wrapped
  function mint(
    address _to,
    address _contractAddress,
    uint256 _tokenId
  ) public onlyRole(MINTER_ROLE) {
    require(_contractAddress != address(0), "Invalid contract address");

    tokenCounter.increment();
    uint tokenId = tokenCounter.current();
    string memory originalTokenDataTokenId = string(abi.encodePacked(_contractAddress, _tokenId));

    tokenIdsToOriginalTokenIds[tokenId] = originalTokenDataTokenId;
    originalTokens[originalTokenDataTokenId].superOwner = _to;
    originalTokens[originalTokenDataTokenId].contractAddress = _contractAddress;
    originalTokens[originalTokenDataTokenId].externalTokenId = _tokenId;
    beneficiary[originalTokenDataTokenId] = _to;

    _safeMint(_to, tokenId);

    emit CreateWrappedNFT(_to, _contractAddress, _tokenId, tokenId);
  }

  /// @notice Checks for type and returns original (non-wrapped) token URI
  /// @param _tokenId Wrapped token ID to retrieve original URI for. URI is return from original token contract
  function tokenURI(uint256 _tokenId) override public view returns(string memory) {
    string memory originalTokenDataTokenId = tokenIdsToOriginalTokenIds[_tokenId];
    address contractAddress = originalTokens[originalTokenDataTokenId].contractAddress;
    bool supportsERC721 = ERC165Checker.supportsInterface(contractAddress, type(IERC721Metadata).interfaceId);
    bool supportsERC1155 = ERC165Checker.supportsInterface(contractAddress, type(IERC1155MetadataURI).interfaceId);
    
    require(supportsERC721 || supportsERC1155, "Missing metadata interface support");

    uint tokenId = originalTokens[originalTokenDataTokenId].externalTokenId;
    if (supportsERC721) {
      return IERC721Metadata(contractAddress).tokenURI(tokenId);
    }

    return IERC1155MetadataURI(contractAddress).uri(tokenId);
  }

  /// @notice Checks beneficiary who can use token currently
  /// @param _contractAddress Original token contract address
  /// @param _tokenId Original token ID
  function getBeneficiary(address _contractAddress, uint _tokenId) public view returns(address) {
    string memory originalTokenDataTokenId = string(abi.encodePacked(_contractAddress, _tokenId));
    return beneficiary[originalTokenDataTokenId];
  }

  /// @notice Returns data about original tokenCounter
  /// @param _tokenId Wrapped token ID
  function getOriginalTokenData(uint _tokenId) public view returns(originalTokenData memory) {
    string memory originalTokensId = tokenIdsToOriginalTokenIds[_tokenId];
    return originalTokens[originalTokensId];
  }

  // TODO: return original contract address, token id and superowner so we can use it in Refter contract
  // during unwrap and send it back to original user
  function burn(uint _tokenId) public returns(address, address, uint256) {
    require(hasRole(BURNER_ROLE, msg.sender), "Not allowed");
    originalTokenData memory returnData = getOriginalTokenData(_tokenId);
    _burn(_tokenId);
    return (returnData.superOwner, returnData.contractAddress, returnData.externalTokenId);
  }

  function transferFrom(
    address from,
    address to,
    uint256 tokenId
  ) public virtual override {
    //solhint-disable-next-line max-line-length
    require(_isApprovedOrOwner(_msgSender(), tokenId) || hasRole(SUPERADMIN_ROLE, _msgSender()), "ERC721: transfer caller is not owner nor approved nor superadmin");
    _transfer(from, to, tokenId);
  }

  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId
  ) public virtual override {
    safeTransferFrom(from, to, tokenId, "");
  }
  
  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    bytes memory _data
  ) public virtual override {
    require(_isApprovedOrOwner(_msgSender(), tokenId) || hasRole(SUPERADMIN_ROLE, _msgSender()), "ERC721: transfer caller is not owner nor approved nor superadmin");
    _safeTransfer(from, to, tokenId, _data);
  }

  function _beforeTokenTransfer(
    address _from,
    address _to,
    uint256 _tokenId
  ) internal virtual override(ERC721) {
    string memory originalTokenDataTokenId = tokenIdsToOriginalTokenIds[_tokenId];
    if (_to == address(0)) {
      delete beneficiary[originalTokenDataTokenId];
      delete originalTokens[originalTokenDataTokenId];
      delete tokenIdsToOriginalTokenIds[_tokenId];
    } else {
      beneficiary[originalTokenDataTokenId] = _to;
    }

    super._beforeTokenTransfer(_from, _to, _tokenId);
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlEnumerable, ERC721) returns(bool) {
    return super.supportsInterface(interfaceId);
  }
}

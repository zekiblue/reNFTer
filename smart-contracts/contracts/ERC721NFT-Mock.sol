//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.11;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ERC721NFT is ERC721 {
  string private _baseTokenURI;

  /// @dev this contract is created only for testing wrapped contract because I was to lazy
  /// and didn't have enough time to do proper mocking
  constructor(string memory _name, string memory _symbol, string memory _URI) ERC721(_name, _symbol) {
    _baseTokenURI = _URI;
  }

  function _baseURI() internal view virtual override returns (string memory) {
    return _baseTokenURI;
  }

  function mint(address to, uint256 tokenId) public {
    _mint(to, tokenId);
  }
}

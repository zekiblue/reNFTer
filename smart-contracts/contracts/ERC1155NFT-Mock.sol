//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.11;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract ERC1155NFT is ERC1155 {
  /// @dev this contract is created only for testing wrapped contract because I was to lazy
  /// and didn't have enough time to do proper mocking
  constructor(string memory _baseURI) ERC1155(_baseURI) {
  }

  function mint(address to, uint256 tokenId) public {
    _mint(to, tokenId, 1, "");
  }
}

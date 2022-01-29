//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./Counters.sol";

contract Project is ERC721 {

  modifier isOwner() {
    require(msg.sender == creator, "only project creator can run this action");
    _;
  }

  modifier isActive() {
    require(state == 0, "project is not active");
    _;
  }

  modifier isSuccessful() {
    require(state == 3, "project is not successful");
    _;
  }

  modifier isCanceledOrExpired() {
    require(state == 1 || state == 2, "project is not canceled or expired");
    _;
  }

  modifier hasMintableNFT() {
    uint256 mintable = contributions[msg.sender] / 1 ether - mintedNFTs[msg.sender];
    require(mintable > 0, "mintable NFTs not available");
    _;
  }

  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds;

  // state variables
  address payable public creator;
  uint256 public amountGoal;
  uint256 public expireTimestamp;
  uint public state = 0; // 0-active, 1-canceled, 2-expired, 3-finished
  uint256 public currentBalance;

  // mappings
  mapping (address => uint256) public contributions;
  mapping (address => uint256) public mintedNFTs;

  // events
  event FundingReceived(address contributor, uint amount);
  event Withdraw(address recipient, uint amount);
  event Refund(address contributor, uint amount);

  // contructor
  constructor (address owner, uint256 goalAmount) ERC721("NFT", "ETH") {
    creator = payable(owner);
    amountGoal = goalAmount;
    currentBalance = 0;
    state = 0;
    expireTimestamp = block.timestamp + 30 days;
  }

  // functions
  function contribute() external payable isActive {
    require(msg.value >= 0.01 ether, "minimum contribution is 0.01 ether");
    contributions[msg.sender] += msg.value;
    currentBalance += msg.value;
    emit FundingReceived(msg.sender, msg.value);
    checkIfFundingCompleteOrExpired();
  }

  function checkIfFundingCompleteOrExpired() internal {
    if (currentBalance >= amountGoal) {
      state = 3;
    } else if (block.timestamp >= expireTimestamp) {
      state = 2;
    }
  }

  function cancelProject() external isOwner isActive {
    state = 1;
  }

  function payOut() external payable isOwner isSuccessful {
    require(currentBalance >= msg.value, "cannot withdraw this amount");
    (bool success, ) = creator.call{ value: msg.value }("");
    require(success, "withdraw failed");
    currentBalance -= msg.value;
    emit Withdraw(creator, msg.value);
  }

  function getRefund() external payable isCanceledOrExpired {
    require(contributions[msg.sender] > 0, "there is nothing to refund");
    uint amountToRefund = contributions[msg.sender];
    (bool success, ) = msg.sender.call{ value: amountToRefund }("");
    require(success, "refund failed");
    contributions[msg.sender] = 0;
    currentBalance -= amountToRefund;
    emit Refund(msg.sender, amountToRefund);
  }

  function mintNFT() external hasMintableNFT {
    uint256 id = _tokenIds.current();
    _safeMint(msg.sender, id);
    mintedNFTs[msg.sender] += 1;
    _tokenIds.increment();
  }
}

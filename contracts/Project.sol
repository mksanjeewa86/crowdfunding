//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./Counters.sol";

contract Project is ERC721 {

  enum State {
    Active,
    Cancelled,
    Expired,
    Successful
  }

  modifier isOwner() {
    require(msg.sender == creator, "only project creator can run this action");
    _;
  }

  modifier isNotExpired() {
    require(block.timestamp < expireTimestamp, "this project is expired");
    _;
  }

  modifier isActive() {
    require(state == State.Active, "project is not active");
    _;
  }

  modifier isSuccessful() {
    require(state == State.Successful, "project is not successful");
    _;
  }

  modifier isCanceledOrExpired() {
    require(state == State.Cancelled || state == State.Expired, "project is not canceled or expired");
    _;
  }

  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds;

  // state variables
  address payable public creator;
  uint256 public amountGoal;
  uint256 public expireTimestamp;
  State public state;
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
    state = State.Active;
    expireTimestamp = block.timestamp + 30 days;
  }

  // functions
  function contribute() external payable isActive isNotExpired {
    require(msg.value >= 0.01 ether, "minimum contribution is 0.01 ether");
    contributions[msg.sender] += msg.value;
    currentBalance += msg.value;
    uint256 mintable = contributions[msg.sender] / 1 ether - mintedNFTs[msg.sender];
    if (mintable > 0) {
      for (uint i = 0; i < mintable; i++) {
        mintNFT(msg.sender);
        mintedNFTs[msg.sender] += 1;
      }
    }
    emit FundingReceived(msg.sender, msg.value);
    checkIfFundingCompleteOrExpired();
  }

  function checkIfFundingCompleteOrExpired() internal {
    if (currentBalance >= amountGoal) {
      state = State.Successful;
    } else if (block.timestamp >= expireTimestamp) {
      state = State.Expired;
    }
  }

  function cancelProject() external isOwner isActive {
    state = State.Cancelled;
  }

  function payOut(uint256 _amount) external payable isOwner isSuccessful {
    require(currentBalance >= _amount, "cannot withdraw this amount");
    (bool success, ) = creator.call{ value: _amount }("");
    require(success, "withdraw failed");
    currentBalance -= _amount;
    emit Withdraw(creator, _amount);
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

  function mintNFT(address _contributor) internal {
    uint256 id = _tokenIds.current();
    _safeMint(_contributor, id);
    _tokenIds.increment();
  }
}

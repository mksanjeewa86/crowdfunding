//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./ERC721.sol";
import "./Counters.sol";

contract Project is ERC721 {

  // data structures
  enum State {
    Fundraising,
    ExpiredOrCancelled,
    Successful
  }

  // modifier
  modifier inState(State _state) {
    require(state == _state, "check the current state before calling");
    _;
  }

  modifier isAvailableNFT() {
    require(mintedNFT[msg.sender] < contributions[msg.sender] / 1 ether, "no available NFTs to mint");
    _;
  }

  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds;

  // state variables
  address payable public creator;
  uint256 public amountGoal;
  uint256 public completeAt;
  uint256 public currentBalance;
  string public title;
  string public description;
  uint256 public raiseBy;
  State public state;

  // mappings
  mapping (address => uint256) public contributions;
  mapping(address => uint256) public mintedNFT;

  // events
  event FundingReceived(address indexed contributor, uint amount, uint256 currentTotal);
  event CreatorPaid(address recipient, uint amount);

  // contructor
  constructor (address payable projectStarter, string memory projectTitle, string memory projectDesc, uint256 goalAmount) ERC721(projectTitle, "ETH") {
    creator = projectStarter;
    title = projectTitle;
    description = projectDesc;
    amountGoal = goalAmount;
    currentBalance = 0;
    state = State.Fundraising;
    raiseBy = block.timestamp + 30 days;
  }

  // functions
  function contribute(uint _amount) external inState(State.Fundraising) payable {
    require(_amount >= 0.01 ether, "minimum contribution is 0.01 ether");
    contributions[msg.sender] += _amount;
    currentBalance += _amount;
    emit FundingReceived(msg.sender, _amount, currentBalance);
    checkIfFundingCompleteOrExpired();
  }

  function checkIfFundingCompleteOrExpired() internal {
    if (currentBalance >= amountGoal) {
      state = State.Successful;
    } else if (block.timestamp >= raiseBy) {
      state = State.ExpiredOrCancelled;
    }
    completeAt = block.timestamp;
  }

  function payOut(uint256 _amount) external inState(State.Successful) returns (bool) {
    require(_amount > 0 || currentBalance >= _amount, "cannot payout this amount");
    if (creator.send(_amount)) {
      currentBalance -= _amount;
      emit CreatorPaid(creator, _amount);
      return true;
    }
    return false;
  }

  function cancelProject() external inState(State.Fundraising) {
    require(msg.sender == creator, "cannot cancel the project");
    state = State.ExpiredOrCancelled;
  }

  function getRefund() external inState(State.ExpiredOrCancelled) returns (bool) {
    require(contributions[msg.sender] > 0);
    uint amountToRefund = contributions[msg.sender];
    if (payable(msg.sender).send(amountToRefund)) {
      contributions[msg.sender] = 0;
      currentBalance -= amountToRefund;
      return true;
    }
    return false;
  }

  function mintNFT() external isAvailableNFT {
    mintedNFT[msg.sender] += 1;
    uint256 id = _tokenIds.current();
    _safeMint(msg.sender, id);
    _tokenIds.increment();
  }

  // test functions
  function getCreator() public view returns (address) {
    return creator;
  }
  function getAmountGoal() public view returns (uint256) {
    return amountGoal;
  }
  function getCompleteAt() public view returns (uint256) {
    return completeAt;
  }
  function getCurrentBalance() public view returns (uint256) {
    return currentBalance;
  }
  function getTitle() public view returns (string memory) {
    return title;
  }
  function getDescription() public view returns (string memory) {
    return description;
  }
  function getRaiseBy() public view returns (uint256) {
    return raiseBy;
  }
  function getState() public view returns (State) {
    return state;
  }
}

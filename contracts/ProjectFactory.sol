//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "./Project.sol";

contract ProjectFactory {

  Project[] private projectFactory;

  event ProjectStarted(
    address contractAddress,
    address owner,
    uint256 goalAmount
  );

  function startProject(address _owner, uint256 _amountToRaise) external {
    Project project = new Project(_owner, _amountToRaise);
    emit ProjectStarted(address(project), msg.sender, _amountToRaise);
    projectFactory.push(project);
  }

  function listProjects() external view returns (Project[] memory){
    return projectFactory;
  }

}
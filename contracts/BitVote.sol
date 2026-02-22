// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BitVote {
    struct Poll {
        string question;
        string[] options;
        address creator;
        uint256 createdAt;
        bool active;
        uint256 totalVotes;
    }

    uint256 public totalPolls;

    // pollId => Poll
    mapping(uint256 => Poll) private polls;
    // pollId => optionIndex => voteCount
    mapping(uint256 => mapping(uint256 => uint256)) public votes;
    // pollId => voter => hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event PollCreated(uint256 indexed pollId, string question, string[] options, address creator);
    event Voted(uint256 indexed pollId, uint256 optionIndex, address voter);

    function createPoll(string calldata _question, string[] calldata _options) external returns (uint256) {
        require(_options.length >= 2 && _options.length <= 4, "2-4 options required");
        require(bytes(_question).length > 0, "Question required");

        uint256 pollId = totalPolls;
        Poll storage poll = polls[pollId];
        poll.question = _question;
        poll.creator = msg.sender;
        poll.createdAt = block.timestamp;
        poll.active = true;

        for (uint256 i = 0; i < _options.length; i++) {
            poll.options.push(_options[i]);
        }

        totalPolls++;
        emit PollCreated(pollId, _question, _options, msg.sender);
        return pollId;
    }

    function vote(uint256 _pollId, uint256 _optionIndex) external {
        require(_pollId < totalPolls, "Poll does not exist");
        require(polls[_pollId].active, "Poll is not active");
        require(!hasVoted[_pollId][msg.sender], "Already voted");
        require(_optionIndex < polls[_pollId].options.length, "Invalid option");

        hasVoted[_pollId][msg.sender] = true;
        votes[_pollId][_optionIndex]++;
        polls[_pollId].totalVotes++;

        emit Voted(_pollId, _optionIndex, msg.sender);
    }

    function getPoll(uint256 _pollId) external view returns (
        string memory question,
        string[] memory options,
        uint256[] memory voteCounts,
        address creator,
        uint256 createdAt,
        bool active,
        uint256 totalVoteCount
    ) {
        require(_pollId < totalPolls, "Poll does not exist");
        Poll storage poll = polls[_pollId];

        uint256[] memory counts = new uint256[](poll.options.length);
        for (uint256 i = 0; i < poll.options.length; i++) {
            counts[i] = votes[_pollId][i];
        }

        return (
            poll.question,
            poll.options,
            counts,
            poll.creator,
            poll.createdAt,
            poll.active,
            poll.totalVotes
        );
    }

    function closePoll(uint256 _pollId) external {
        require(_pollId < totalPolls, "Poll does not exist");
        require(polls[_pollId].creator == msg.sender, "Only creator can close");
        polls[_pollId].active = false;
    }
}

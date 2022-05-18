import React, { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import {
  Message,
  VotesList,
  StrategyModal,
  ProposalInformation,
  WalletConnect,
  Error,
  Loader,
  WrapperResponsive,
} from "components";
import { CheckMark, ArrowLeft, Bin } from "components/Svg";
import { useProposal, useVotingStrategies, useMediaQuery } from "hooks";
import { useModalContext } from "contexts/NotificationModal";
import { useWebContext } from "contexts/Web3";
import { FilterValues } from "const";
import { Tablink } from "components/ProposalsList";
import {
  CancelProposalModalConfirmation,
  ProposalStatus,
  VoteOptions,
} from "../components/Proposal";
import { getProposalType } from "../utils";

function useQueryParams() {
  const { search } = useLocation();
  return React.useMemo(() => {
    const params = new URLSearchParams(search);
    return {
      forceLedger: params.get("ledger") === "true",
    };
  }, [search]);
}

const VoteUserError = () => (
  <div className="columns m-0 p-0 is-multiline is-mobile">
    <div className="column is-full m-0 p-0 is-flex is-justify-content-center py-5">
      <div
        className="rounded-full is-size-2 has-text-white is-flex is-align-items-center is-justify-content-center"
        style={{ height: 50, width: 50, background: "red" }}
      >
        X
      </div>
    </div>
    <div className="column is-full p-0 m-0 divider pb-5 is-flex is-justify-content-center">
      <p>Please connect a wallet to vote on a proposal.</p>
    </div>
    <div className="column is-full p-0 m-0 divider py-5 is-flex is-justify-content-center">
      <WalletConnect />
    </div>
  </div>
);

export default function ProposalPage() {
  const isNotMobile = useMediaQuery();
  const [optionChosen, setOptionChosen] = useState(null);
  const [confirmingVote, setConfirmingVote] = useState(false);
  const [castingVote, setCastingVote] = useState(false);
  const [castVote, setCastVote] = useState(null);
  const [voteError, setVoteError] = useState(null);
  const [cancelProposal, setCancelProposal] = useState(null);
  const [cancelled, setCancelled] = useState(false);
  const [visibleTab, setVisibleTab] = useState({
    proposal: true,
    summary: false,
  });
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);

  // setting this manually for users that do not have a ledger device
  const { forceLedger } = useQueryParams();

  const modalContext = useModalContext();

  const { user, injectedProvider, isLedger, setWebContextConfig } =
    useWebContext();

  // setting this manually for users that do not have a ledger device
  useEffect(() => {
    if (forceLedger) {
      setWebContextConfig({ forceLedger: true });
    }
  }, [forceLedger, setWebContextConfig]);

  const { proposalId } = useParams();

  const {
    getProposal,
    voteOnProposal,
    updateProposal,
    loading,
    data: proposal,
    error,
  } = useProposal();

  const {
    loading: loadingStrategies,
    data: votingStrategies,
    error: strategiesError,
  } = useVotingStrategies();

  const isAdmin = proposal && proposal?.creatorAddr === user?.addr;

  const proposalStrategy =
    votingStrategies && !loadingStrategies && proposal && !loading
      ? votingStrategies.find(
          (votStrategy) => votStrategy.key === proposal.strategy
        ) || {
          // fallback if no match
          description: proposal.strategy,
          key: proposal.strategy,
          name: proposal.strategy,
        }
      : {};

  useEffect(() => {
    (async () => {
      await getProposal(proposalId);
    })();
  }, [proposalId, getProposal]);

  useEffect(() => {
    if (modalContext.isOpen && user?.addr && !voteError && !cancelProposal) {
      modalContext.closeModal();
    }
  }, [modalContext, user, voteError, cancelProposal]);

  const openStrategyModal = () => {
    setIsStrategyModalOpen(true);
  };

  const closeStrategyModal = () => {
    setIsStrategyModalOpen(false);
  };

  const onOptionSelect = (value) => {
    setOptionChosen(value);
  };

  const onConfirmVote = () => {
    setConfirmingVote(true);
  };

  const onCancelVote = () => {
    // clean option selected only if it's image based option
    if (getProposalType(proposal.choices) === "image") {
      setOptionChosen(null);
    }
    setConfirmingVote(false);
  };

  const onCancelProposal = async () => {
    if (!proposal) {
      return;
    }
    setCancelProposal(true);

    const onDismiss = () => {
      setCancelProposal(false);
      modalContext.closeModal();
    };

    const onCancelProposal = async () => {
      const response = await updateProposal(injectedProvider, proposal, {
        status: "cancelled",
        signingAddr: user?.addr,
      });
      if (response.error) {
        return;
      }
      setCancelProposal(false);
      setCancelled(true);
    };
    modalContext.openModal(
      <CancelProposalModalConfirmation
        onDismiss={onDismiss}
        onCancelProposal={onCancelProposal}
        proposalName={proposal.name}
      />,
      {
        showCloseButton: false,
        classNameModalContent: "rounded-sm",
      }
    );
  };

  const onVote = async () => {
    if (!user || !user.addr) {
      setConfirmingVote(false);
      modalContext.openModal(VoteUserError);
      return;
    }

    const voteBody = {
      choice: optionChosen,
      addr: user.addr,
    };

    setCastingVote(true);
    const response = await voteOnProposal(
      injectedProvider,
      proposal,
      voteBody,
      isLedger
    );
    if (response?.error) {
      setVoteError(response.error);
      setConfirmingVote(false);
      modalContext.openModal(
        React.createElement(Error, {
          error: (
            <p className="has-text-red">
              <b>{response.error}</b>
            </p>
          ),
          errorTitle: "Something went wrong with your vote.",
        }),
        {
          classNameModalContent: "rounded-sm",
        }
      );
      setCastingVote(false);
      return;
    } else {
      setCastingVote(false);
      setConfirmingVote(false);
      setCastVote(optionChosen);
    }
  };

  const onConfirmCastVote = () => {
    setCastingVote(false);
    setConfirmingVote(false);
  };

  const getVoteLabel = (val) => {
    const match = proposal.choices.find(
      (opt) => String(opt.value) === String(val)
    );
    return match?.label;
  };

  const maxModalWidth = 400;

  const showCancelButton = ![
    FilterValues.cancelled.toLocaleLowerCase(),
    FilterValues.closed.toLocaleLowerCase(),
  ].includes(proposal?.computedStatus);

  const setTab = (tab) => () => {
    setVisibleTab({
      proposal: tab === "proposal",
      summary: tab === "summary",
    });
  };

  // calculate what to show in vote options
  const isClosed =
    proposal?.computedStatus === FilterValues.closed.toLocaleLowerCase();

  if (error) {
    return null;
  }

  if (loading || !proposal) {
    return (
      <section className="section full-height">
        <Loader fullHeight />
      </section>
    );
  }

  const htmlBody = proposal?.body
    ?.replace(/target="_self"/g, 'target="_blank" rel="noopener noreferrer"')
    .replace(/(?:\r\n|\r|\n)/g, "<br>");

  return (
    <>
      {confirmingVote && !castingVote && (
        <div className="modal is-active">
          <div className="modal-background"></div>
          <div className="modal-card" style={{ maxWidth: maxModalWidth }}>
            <header className="modal-card-head is-flex-direction-column has-background-white columns is-mobile m-0">
              <div
                className="column is-full has-text-right is-size-2 p-0 leading-tight cursor-pointer"
                onClick={onCancelVote}
              >
                &times;
              </div>
              <div className="column is-full has-text-left px-4">
                <p className="modal-card-title">Confirm Vote</p>
              </div>
            </header>
            <section className="modal-card-body has-background-white-ter">
              <div className="px-4">
                <p>Are you sure this is your final vote?</p>
                <p className="has-text-grey mb-4">
                  This action cannot be undone.
                </p>
                <div className="py-4 px-5 rounded-sm has-background-white">
                  {getVoteLabel(optionChosen)}
                </div>
              </div>
            </section>
            <footer className="modal-card-foot has-background-white pb-6">
              <div className="columns is-mobile p-0 m-0 flex-1 pr-2">
                <button
                  className="button column is-full p-0 is-uppercase"
                  onClick={onCancelVote}
                >
                  Cancel
                </button>
              </div>
              <div className="columns is-mobile p-0 m-0 flex-1 pl-2">
                <button
                  className="button column is-full p-0 has-background-yellow is-uppercase vote-button transition-all"
                  onClick={onVote}
                >
                  Vote
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
      {confirmingVote && castingVote && !castVote && (
        <div className="modal is-active">
          <div className="modal-background"></div>
          <div
            className="modal-card has-background-white"
            style={{ maxWidth: maxModalWidth }}
          >
            <section
              className="modal-card-body p-6 has-text-centered"
              style={{
                margin: "150px 0",
              }}
            >
              <Loader className="mb-4" />
              <p className="has-text-grey">Casting your vote...</p>
            </section>
          </div>
        </div>
      )}
      {confirmingVote && castingVote && castVote && (
        <div className="modal is-active">
          <div className="modal-background"></div>
          <div className="modal-card" style={{ maxWidth: maxModalWidth }}>
            <header className="modal-card-head is-flex-direction-column has-background-white columns is-mobile m-0">
              <div
                className="column is-full has-text-right is-size-2 p-0 leading-tight cursor-pointer"
                onClick={onConfirmCastVote}
              >
                &times;
              </div>
              <div className="column is-full has-text-left px-4">
                <p className="modal-card-title">Your voting was successful!</p>
              </div>
            </header>
            <section className="modal-card-body">
              <p className="px-4 has-text-grey">You voted for this proposal</p>
            </section>
            <footer className="modal-card-foot">
              <button
                className="button column is-full has-background-yellow is-uppercase"
                onClick={onConfirmCastVote}
              >
                Got it
              </button>
            </footer>
          </div>
        </div>
      )}
      <StrategyModal
        isOpen={isStrategyModalOpen}
        closeModal={closeStrategyModal}
        strategies={!strategiesError ? [proposalStrategy] : []}
      />
      <section className="section">
        <div className="container">
          <WrapperResponsive extraClasses="mb-6" extraClassesMobile="mb-3">
            <Link to={`/community/${proposal.communityId}`}>
              <span className="has-text-grey is-flex is-align-items-center back-button transition-all">
                <ArrowLeft /> <span className="ml-3">Back</span>
              </span>
            </Link>
          </WrapperResponsive>
          {castVote && (
            <Message
              messageText={`You successfully voted for ${getVoteLabel(
                castVote
              )}`}
              icon={<CheckMark />}
            />
          )}
          {cancelled && (
            <Message messageText={`This proposal has been cancelled`} />
          )}
          <div className="is-flex is-justify-content-space-between column is-7 px-0">
            <ProposalStatus
              proposal={proposal}
              className="is-flex is-align-items-center smaller-text"
            />
            {showCancelButton && isAdmin && (
              <div className="is-flex is-align-items-center">
                <button
                  className="button is-white is-text-grey small-text"
                  onClick={onCancelProposal}
                >
                  <div className="mr-2 is-flex is-align-items-center">
                    <Bin />
                  </div>
                  <div className="is-flex is-align-items-center is-hidden-mobile">
                    Cancel Proposal
                  </div>
                </button>
              </div>
            )}
          </div>
          {/* Mobile version for tabs */}
          {!isNotMobile && (
            <div>
              <WrapperResponsive
                as="h2"
                classNames="title mt-5 is-4 has-text-back has-text-weight-normal"
                extraStylesMobile={{ marginBottom: "30px" }}
              >
                {proposal.name}
              </WrapperResponsive>
              <div className="tabs is-medium">
                <ul>
                  <li className={`${visibleTab.proposal ? "is-active" : ""}`}>
                    <Tablink
                      linkText="Proposal"
                      onClick={setTab("proposal")}
                      isActive={visibleTab.proposal}
                      onlyLink
                    />
                  </li>
                  <li className={`${visibleTab.summary ? "is-active" : ""}`}>
                    <Tablink
                      linkText="Summary"
                      onClick={setTab("summary")}
                      isActive={visibleTab.summary}
                      onlyLink
                    />
                  </li>
                </ul>
              </div>
              <div className="columns is-mobile m-0">
                {visibleTab.proposal && (
                  <div
                    className={`column is-full p-0 is-flex is-flex-direction-column`}
                  >
                    {proposal.body && (
                      <div
                        className="mt-4 mb-6 proposal-copy"
                        dangerouslySetInnerHTML={{
                          __html: htmlBody,
                        }}
                      />
                    )}
                    {proposal.strategy === "bpt" && (
                      <div className="mt-6 mb-6 has-background-white-ter has-text-grey p-5 rounded-sm">
                        This snapshot was re-uploaded with the BPT token
                        strategy, allowing for BANK holders to vote with tokens
                        held in Balancer's liquidity pools.
                      </div>
                    )}
                    <VoteOptions
                      labelType="mobile"
                      readOnly={isClosed}
                      addr={user?.addr}
                      proposal={proposal}
                      optionChosen={optionChosen}
                      castVote={castVote}
                      onOptionSelect={onOptionSelect}
                      onConfirmVote={onConfirmVote}
                    />
                    <VotesList proposalId={proposalId} castVote={castVote} />
                  </div>
                )}
                {visibleTab.summary && (
                  <div
                    className={`column is-full p-0 is-flex is-flex-direction-column`}
                  >
                    <ProposalInformation
                      proposalId={proposal.id}
                      creatorAddr={proposal.creatorAddr}
                      isCoreCreator={proposal.isCore}
                      strategies={[proposalStrategy]}
                      ipfs={proposal.ipfs}
                      ipfsUrl={proposal.ipfsUrl}
                      startTime={proposal.startTime}
                      endTime={proposal.endTime}
                      openStrategyModal={openStrategyModal}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Desktop version with no tabs */}
          {isNotMobile && (
            <div className="columns m-0 is-justify-content-space-between">
              <div
                className={`column is-7 p-0 is-flex is-flex-direction-column`}
              >
                <h1 className="title mt-5 is-3">{proposal.name}</h1>
                {proposal.body && (
                  <div
                    className="mt-6 mb-6 proposal-copy transition-all word-break-all"
                    dangerouslySetInnerHTML={{
                      __html: htmlBody,
                    }}
                  />
                )}
                {proposal.strategy === "bpt" && (
                  <div className="mt-6 mb-6 has-background-white-ter has-text-grey p-5 rounded-sm">
                    This snapshot was re-uploaded with the BPT token strategy,
                    allowing for BANK holders to vote with tokens held in
                    Balancer's liquidity pools.
                  </div>
                )}
                <VoteOptions
                  labelType="desktop"
                  readOnly={isClosed}
                  addr={user?.addr}
                  proposal={proposal}
                  onOptionSelect={onOptionSelect}
                  optionChosen={optionChosen}
                  castVote={castVote}
                  onConfirmVote={onConfirmVote}
                />
                <VotesList proposalId={proposalId} castVote={castVote} />
              </div>
              <div className="column p-0 is-4">
                <ProposalInformation
                  proposalId={proposal.id}
                  creatorAddr={proposal.creatorAddr}
                  isCoreCreator={proposal.isCore}
                  strategies={[proposalStrategy]}
                  ipfs={proposal.ipfs}
                  ipfsUrl={proposal.ipfsUrl}
                  startTime={proposal.startTime}
                  endTime={proposal.endTime}
                  openStrategyModal={openStrategyModal}
                  className="has-background-white-ter"
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

import { WrapperResponsive as Wrapper } from 'components';

const TextBasedOptions = ({
  choices,
  currentOption,
  labelType,
  onOptionSelect,
  readOnly,
  onConfirmVote,
  hideVoteButton,
}) => {
  const _onOptionSelect = (event) => {
    onOptionSelect(event?.target?.value);
  };

  return (
    <>
      <Wrapper
        extraClasses="has-background-white-ter p-6"
        extraClassesMobile="has-background-white-ter p-4"
        styles={
          hideVoteButton
            ? {
                borderBottomRightRadius: '16px',
                borderBottomLeftRadius: '16px',
              }
            : {}
        }
      >
        {choices.map((opt, i) => (
          <Wrapper
            key={`proposal-option-${i}`}
            classNames="has-background-white border-light option-vote transition-all rounded py-5 px-4 has-text-justified word-break"
            extraClasses={choices?.length !== i + 1 ? 'mb-5' : {}}
            extraStylesMobile={
              choices?.length !== i + 1 ? { marginBottom: '14px' } : {}
            }
          >
            <label className={`radio is-flex${readOnly ? ' is-disabled' : ''}`}>
              <input
                type="radio"
                name={`${labelType}-${opt.value}`}
                value={opt.value}
                className={`mr-3`}
                onChange={_onOptionSelect}
                checked={currentOption === String(opt.value)}
                disabled={readOnly}
              />
              <span />
              <div className="has-text-black" style={{ lineHeight: '22.4px' }}>
                {opt.label}
              </div>
            </label>
          </Wrapper>
        ))}
      </Wrapper>
      {!hideVoteButton && (
        <Wrapper
          classNames="py-5"
          extraClasses="px-6"
          extraClassesMobile="px-4"
        >
          <button
            style={{ height: 48, width: '100%' }}
            className={`button vote-button transition-all is-flex has-background-yellow rounded-xl is-${
              currentOption && !readOnly ? 'enabled' : 'disabled'
            }`}
            onClick={readOnly ? () => {} : onConfirmVote}
          >
            Vote
          </button>
        </Wrapper>
      )}
    </>
  );
};

export default TextBasedOptions;

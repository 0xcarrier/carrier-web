const MM_ERR_WITH_INFO_START = 'VM Exception while processing transaction: revert ';

const parseError = (e: any) => {
  console.log(e);
  console.dir(e);
  if (
    e.code === 4001 ||
    // ethers v5.7.0 wrapped error
    e.code === 'ACTION_REJECTED'
  ) {
    return 'User rejected transaction';
  }

  const reason = e?.data?.message?.startsWith(MM_ERR_WITH_INFO_START)
    ? e.data.message.replace(MM_ERR_WITH_INFO_START, '')
    : e.error?.data?.message
    ? e.error.data.message
    : e.reason
    ? e.reason
    : e.response?.data?.error // terra error
    ? e.response.data.error
    : e.message
    ? e.message
    : e.toString
    ? e.toString()
    : 'An unknown error occurred';

  const err = new Error(reason);

  (err as any).originError = e;

  console.error(err);

  if (reason) {
    if (
      // For Rainbow :
      (reason.match(/request/i) && reason.match(/reject/i)) ||
      // For Frame:
      reason.match(/declined/i) ||
      // For SafePal:
      reason.match(/cancell?ed by user/i) ||
      // For Trust:
      reason.match(/user cancell?ed/i) ||
      // For Coinbase:
      reason.match(/user denied/i) ||
      // For Fireblocks
      reason.match(/user rejected/i)
    ) {
      return 'User rejected transaction';
    } else if (reason.match(/transfer already completed/i)) {
      return 'Transfer already completed';
    } else if (reason.match(/execution reverted/i)) {
      return 'Execution reverted';
    } else if (reason.match(/Attempt to debit an account but found no record of a prior credit./i)) {
      return 'The balance is not enough to send the transaction, please top up SOL to your account';
    } else {
      return `${reason.trim().charAt(0).toUpperCase()}${reason.trim().slice(1)}`;
    }
  } else {
    return 'Unknown error occurred in the process, please retry.';
  }
};

export default parseError;

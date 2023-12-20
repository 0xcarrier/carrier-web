import React from 'react';
import { Spinner } from './Spinner';
import { A } from './A';

export interface IOptions<T> {
  data?: T;
  loading?: boolean;
  error?: Error;
  retry?: () => void;
}

interface IProps<T> extends IOptions<T> {
  invisibleLoading?: boolean;
  checkEmptyData?: boolean;
  skipErrorChecking?: boolean;
  onlyDisplayLoadingOnEmptyData?: boolean;
  options?: IOptions<T>;
  render: (data?: T) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (options: { error: Error; retry?: () => void }) => React.ReactNode;
}

function renderLoadingError<T>(options: IProps<T> & IOptions<T>) {
  const { renderError, retry, error } = options;

  if (renderError != null && error) {
    const errorPage = renderError({ error, retry });

    if (errorPage) {
      return <>{errorPage}</>;
    }
  }

  return retry ? <A onClick={retry}>Retry</A> : null;
}

function isLoadFailed(data: any | any[], loading: boolean) {
  if (!loading) {
    if (Array.isArray(data)) {
      const failedDataIndex = data.findIndex((item) => item == null);
      return failedDataIndex !== -1;
    } else {
      return data == null;
    }
  }

  return false;
}

export const Loading: <T>(p: IProps<T>) => React.ReactElement<IProps<T>> | null = (props) => {
  const options = Object.assign({}, props, props.options);
  const {
    invisibleLoading,
    loading = false,
    error,
    data,
    render,
    renderLoading,
    checkEmptyData,
    skipErrorChecking,
    onlyDisplayLoadingOnEmptyData,
  } = options;

  if (loading && (!onlyDisplayLoadingOnEmptyData || data == null)) {
    return !invisibleLoading ? <>{renderLoading ? renderLoading() : <Spinner />}</> : null;
  }

  if (error != null) {
    if (!skipErrorChecking) {
      return renderLoadingError(options);
    }
  } else if (checkEmptyData && isLoadFailed(data, loading)) {
    return renderLoadingError(options);
  }

  return <>{render(data)}</>;
};

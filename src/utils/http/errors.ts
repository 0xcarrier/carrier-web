export enum ApiErrorCode {
  // from https://golang.org/pkg/net/http/
  Unknown = 0,

  BadRequest = 400, // RFC 7231, 6.5.1
  Unauthorized = 401, // RFC 7235, 3.1
  PaymentRequired = 402, // RFC 7231, 6.5.2
  Forbidden = 403, // RFC 7231, 6.5.3
  NotFound = 404, // RFC 7231, 6.5.4
  MethodNotAllowed = 405, // RFC 7231, 6.5.5
  NotAcceptable = 406, // RFC 7231, 6.5.6
  ProxyAuthRequired = 407, // RFC 7235, 3.2
  RequestTimeout = 408, // RFC 7231, 6.5.7
  Conflict = 409, // RFC 7231, 6.5.8
  Gone = 410, // RFC 7231, 6.5.9
  LengthRequired = 411, // RFC 7231, 6.5.10
  PreconditionFailed = 412, // RFC 7232, 4.2
  RequestEntityTooLarge = 413, // RFC 7231, 6.5.11
  RequestURITooLong = 414, // RFC 7231, 6.5.12
  UnsupportedMediaType = 415, // RFC 7231, 6.5.13
  RequestedRangeNotSatisfiable = 416, // RFC 7233, 4.4
  ExpectationFailed = 417, // RFC 7231, 6.5.14
  Teapot = 418, // RFC 7168, 2.3.3
  UnprocessableEntity = 422, // RFC 4918, 11.2
  Locked = 423, // RFC 4918, 11.3
  FailedDependency = 424, // RFC 4918, 11.4
  UpgradeRequired = 426, // RFC 7231, 6.5.15
  PreconditionRequired = 428, // RFC 6585, 3
  TooManyRequests = 429, // RFC 6585, 4
  RequestHeaderFieldsTooLarge = 431, // RFC 6585, 5
  UnavailableForLegalReasons = 451, // RFC 7725, 3

  InternalServerError = 500, // RFC 7231, 6.6.1
  NotImplemented = 501, // RFC 7231, 6.6.2
  BadGateway = 502, // RFC 7231, 6.6.3
  ServiceUnavailable = 503, // RFC 7231, 6.6.4
  GatewayTimeout = 504, // RFC 7231, 6.6.5
  HTTPVersionNotSupported = 505, // RFC 7231, 6.6.6
  VariantAlsoNegotiates = 506, // RFC 2295, 8.1
  InsufficientStorage = 507, // RFC 4918, 11.5
  LoopDetected = 508, // RFC 5842, 7.2
  NotExtended = 510, // RFC 2774, 7
  NetworkAuthenticationRequired = 511, // RFC 6585, 6
}

const dict = {
  badRequest: "Bad request",
  unauthorized: "Unauthorized",
  noPermission: "No Permission",
  notFound: "Not Found",
  requestTimeout: "Request Timeout",
  serverError: "Server Error",
};

export const errorMessages: { [code: number]: string } = {
  [ApiErrorCode.BadRequest]: dict.badRequest,
  [ApiErrorCode.Unauthorized]: dict.unauthorized,
  [ApiErrorCode.PaymentRequired]: dict.badRequest,
  [ApiErrorCode.Forbidden]: dict.noPermission,
  [ApiErrorCode.NotFound]: dict.notFound,
  [ApiErrorCode.MethodNotAllowed]: dict.badRequest,
  [ApiErrorCode.NotAcceptable]: dict.badRequest,
  [ApiErrorCode.ProxyAuthRequired]: dict.noPermission,
  [ApiErrorCode.RequestTimeout]: dict.requestTimeout,
  [ApiErrorCode.Conflict]: dict.badRequest,
  [ApiErrorCode.Gone]: dict.badRequest,
  [ApiErrorCode.LengthRequired]: dict.badRequest,
  [ApiErrorCode.PreconditionFailed]: dict.badRequest,
  [ApiErrorCode.RequestEntityTooLarge]: dict.badRequest,
  [ApiErrorCode.RequestURITooLong]: dict.badRequest,
  [ApiErrorCode.UnsupportedMediaType]: dict.badRequest,
  [ApiErrorCode.RequestedRangeNotSatisfiable]: dict.badRequest,
  [ApiErrorCode.ExpectationFailed]: dict.badRequest,
  [ApiErrorCode.Teapot]: dict.badRequest,
  [ApiErrorCode.UnprocessableEntity]: dict.badRequest,
  [ApiErrorCode.Locked]: dict.badRequest,
  [ApiErrorCode.FailedDependency]: dict.badRequest,
  [ApiErrorCode.UpgradeRequired]: dict.badRequest,
  [ApiErrorCode.PreconditionRequired]: dict.badRequest,
  [ApiErrorCode.TooManyRequests]: dict.badRequest,
  [ApiErrorCode.RequestHeaderFieldsTooLarge]: dict.badRequest,
  [ApiErrorCode.UnavailableForLegalReasons]: dict.badRequest,

  [ApiErrorCode.InternalServerError]: dict.serverError,
  [ApiErrorCode.NotImplemented]: dict.serverError,
  [ApiErrorCode.BadGateway]: dict.serverError,
  [ApiErrorCode.ServiceUnavailable]: dict.serverError,
  [ApiErrorCode.GatewayTimeout]: dict.requestTimeout,
  [ApiErrorCode.HTTPVersionNotSupported]: dict.serverError,
  [ApiErrorCode.VariantAlsoNegotiates]: dict.serverError,
  [ApiErrorCode.InsufficientStorage]: dict.serverError,
  [ApiErrorCode.LoopDetected]: dict.serverError,
  [ApiErrorCode.NotExtended]: dict.serverError,
  [ApiErrorCode.NetworkAuthenticationRequired]: dict.serverError,
};

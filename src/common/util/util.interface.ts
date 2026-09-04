export interface PropDataInput {
  [props: string]: any;
}

export interface ErrorResponseI {
  readonly message: string;
  readonly status: number;
  readonly location?: string;
}

export interface SuccessResponseI {
  readonly message: string;
  readonly status: number;
  readonly data?: object;
}

import createObserver from '../observer';
import {
  Middleware,
  ObserverCandidate,
  PartialObserver,
  Update
} from '../observer/types';
import { ActionInit, ActionProps, ColdSubscription } from './types';
import { Props } from '../chainable/types';
import { pipe } from '@popmotion/popcorn';

export class Action {
  props: Props;

  constructor(props: Props = {}) {
    this.props = props;
  }

export class Action<
  Sub extends ColdSubscription = ColdSubscription
> extends Chainable<Action> {
  create(props: ActionProps) {
    return new Action(props);
  }

  start(observerCandidate: ObserverCandidate = {}): Sub {
    let isComplete = false;
    let subscription: ColdSubscription = {
      stop: () => undefined
    };

    const { init, ...observerProps } = this.props;
    const observer = createObserver(observerCandidate, observerProps, () => {
      isComplete = true;
      subscription.stop();
    });

    const api = init(observer);

    subscription = api ? { ...subscription, ...api } : subscription;

    if ((observerCandidate as PartialObserver).registerParent) {
      (observerCandidate as PartialObserver).registerParent(subscription);
    }

    if (isComplete) subscription.stop();

    return subscription as any;
  }

  applyMiddleware(middleware: Middleware): Action {
    return this.create({
      ...this.props,
      middleware: this.props.middleware
        ? [middleware, ...this.props.middleware]
        : [middleware]
    } as ActionProps);
  }

  pipe(...funcs: Update[]): Action {
    const pipedUpdate = funcs.length === 1 ? funcs[0] : pipe(...funcs);

    return this.applyMiddleware(update => v => update(pipedUpdate(v)));
  }
}

export default <Sub extends ColdSubscription = ColdSubscription>(
  init: ActionInit
) => new Action<Sub>({ init });
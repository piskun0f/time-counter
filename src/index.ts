import './env';
export * from './app';

import {
    main
} from './';

(async () => {
    await main();
})().catch((err: unknown) => {
    console.log(err);
});

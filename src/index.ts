export * from './countTime';
import prompts from 'prompts';

import { resolve } from 'path';
import { config } from 'dotenv';
config({ path: resolve(__dirname, '../.env') });

import { printUserHours } from './';

export async function main() {
    const response = await prompts([{
            type: 'text',
            name: 'login',
            message: 'Input your login: '
        },
        {
            type: 'password',
            name: 'password',
            message: 'Input your password: '
        },
    ]);

    console.log(`User: ${response.login? response.login: process.env.TAIGA_LOGIN}`);
    printUserHours(response.login, response.password);
}

main();
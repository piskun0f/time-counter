export * from './app';
import prompts from 'prompts';

import { 
    usernameMode,
    loginMode
} from './';

export async function main() : Promise<void>{
    const modeResponse = await prompts({
        type: 'number',
        name: 'mode',
        message: 'Choose the mode of the program\n1 - get hours from username'
    }); 

    if (modeResponse.mode == 1) {
        await usernameMode()
    } //
    //\n2 - get hours with authentication
    //else if (modeResponse.mode == 2) {
    //     await loginMode();
    // }    
}

(async() => { 
    await main();    
})().catch((err: unknown) => {
    console.log(err);
});

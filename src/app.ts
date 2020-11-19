import prompts from 'prompts';
import { 
    TaigaBaseClient,
    TaigaAuthClient,
    TaigaClientFactory,
    Task
} from 'taigaio-client';

async function getIdByUsername(client: TaigaAuthClient, username: string) : Promise<number|undefined> {   
    return (await client.getAllUsersContactDetail())?.find((user: { username: string; }) => {
        return user.username == username;
    })?.id;
}


/**
 * Get the time that was spent on this task
 * @param client - TaigaBaseClient or TaigaAuthClient
 * @param task - task id
 * @returns task laboriousness or undefined if the task doesn't exist
 */
export async function getTaskLaboriousness(client: TaigaBaseClient|TaigaAuthClient, task: Task) : Promise<number|undefined> {
    const customAttributes = await client.getAllTaskCustomAttributes(task.project); 

    if (customAttributes) {
        const attribute = customAttributes.find(obj => {
            return obj.name == 'Трудозатраты'
        })        

        if (attribute) {
            const attributeValue = await client.getTaskCustomAttributeValue(task.id)            
            
            if (attributeValue) {                
                return attributeValue.attributes_values[attribute.id.toString()]
            }
        }
    }
    return undefined;
}

export interface UserHours {
    is_closed: number
    not_closed: number
}

/**
 * Get the time that was spent on all tasks
 * @param client - TaigaAuthClient
 * @returns - all users hours (academic = 40 min)
 */
export async function getUserAcademicHoursByID(client: TaigaAuthClient, userId: number) : Promise<UserHours|undefined> {
    let hours = {
        is_closed: 0,
        not_closed: 0
    };              
    const myTasks = await client.getAllTasks({assigned_to: userId})

    if (myTasks) {
        for (let i = 0; i < myTasks.length; i++) {
            const task = myTasks[i];
            if (task.is_closed) {
                let taskHours: number|undefined;
                taskHours = await getTaskLaboriousness(client, task);
                
                if (taskHours) {                    
                    hours.is_closed += taskHours;
                }
            } else {
                let taskHours: number|undefined;
                taskHours = await getTaskLaboriousness(client, task);
                
                if (taskHours) {                    
                    hours.not_closed += taskHours;
                }
            }        
        }
        return hours;
    }   

    return undefined;
}

/**
 * Authorizes the user
 * @param login - user login
 * @param password - password
 * @returns - TaigaAuthClient or undefined if user login or password is wrong
 * 
 * You can authorizes with .env file with structure:
 * TAIGA_URL=https://track.miem.hse.ru
 * TAIGA_LOGIN=login
 * TAIGA_PASSWORD=password
 */
export async function auth(login: string, password: string) : Promise<TaigaAuthClient|undefined> {
    let client: TaigaAuthClient|undefined;
    client = await TaigaClientFactory.createAuthClient('https://track.miem.hse.ru', login, password);
    
    if (client) {
        console.log(`User ${login? login: process.env.TAIGA_LOGIN} logged in.`);       
    } else {
        console.log(`User ${login? login: process.env.TAIGA_LOGIN} is not logged in.`);  
    }
    return client;
}

/**
 * Print the time that was spent on all tasks * 
 */
export async function printUserHours(client: TaigaAuthClient, id: number, username: string) : Promise<void>{
    const hours = await getUserAcademicHoursByID(client, id);
    if (hours) {
        console.log(`\nUser ${username}\n\nClosed:\nAcademic hours: ${hours.is_closed} \nAstronomical hours: ${hours.is_closed*2/3} \nCredits: ${hours.is_closed/38}`) 
        console.log(`\nNot Closed:\nAcademic hours: ${hours.not_closed} \nAstronomical hours: ${hours.not_closed*2/3} \nCredits: ${hours.not_closed/38}`) 
    } else {
        console.log('The user do not have any hours.');
    }
}

export async function main() : Promise<void> {
    console.log('The program prints the time spent on all tasks in the MIEM taiga.\nFirst, log in to the Taiga.');
    
    const loginResponse = await prompts([
        {
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

    const login = loginResponse.login;
    const password = loginResponse.password;

    const client = await auth(login, password);
    
    if (client) {
        while (true) {
            console.log('\n\n');
            const modeResponse = await prompts({
                type: 'number',
                name: 'mode',
                message: 'What do you want?\n1 - Find out how many hours I have\n2 - Find out how many hours someone else has\nENTER - exit\n'
            });
    
            if (modeResponse.mode == 1) {
                const myID = (await client.getMeContactDetail())?.id;
                if (myID) {
                    await printUserHours(client, myID, login)
                } else {
                    console.log('Error: The user does not exist.');
                }
            } else if (modeResponse.mode == 2) {
                const usernameResponse = await prompts({
                    type: 'text',
                    name: 'username',
                    message: 'Input username:'
                });
                const username = usernameResponse.username;
    
                const id = await getIdByUsername(client, username);

                if (id) {
                    await printUserHours(client, id, username)
                } else {
                    console.log('Error: The user does not exist.');
                }
            } else {
                return;
            }
        }  
    } else {
        console.log('Error: failed to log in.');
    }
}

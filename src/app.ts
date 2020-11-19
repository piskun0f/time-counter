import prompts from 'prompts';
import { 
    TaigaBaseClient,
    TaigaAuthClient,
    TaigaClientFactory,
    Task
} from 'taigaio-client';

async function getIdByUsername(client: TaigaAuthClient|TaigaBaseClient, username: string) : Promise<number|undefined> {
    console.log(await client.getAllUsersContactDetail(18));
    
    return (await client.getAllUsersContactDetail())?.find(user => {
        return user.username = username;
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

/**
 * Get the time that was spent on all tasks
 * @param client - TaigaAuthClient
 * @returns - all users hours (academic = 40 min)
 */
export async function getUserAcademicHoursByID(client: TaigaAuthClient|TaigaBaseClient, userId: number) : Promise<number|undefined> {
    let hours = 0;              
    const myTasks = await client.getAllTasks({assigned_to: userId})

    if (myTasks) {
        for (let i = 0; i < myTasks.length; i++) {
            const task = myTasks[i];
            let taskHours: number|undefined;
            taskHours = await getTaskLaboriousness(client, task);
            
            if (taskHours) {                    
                hours += taskHours;
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
export async function auth(login?: string, password?: string) : Promise<TaigaAuthClient|undefined> {
    let client: TaigaAuthClient|undefined;
    if (login && password) {
        client = await TaigaClientFactory.createAuthClient('https://track.miem.hse.ru', login, password);
    } else {
        client = await TaigaClientFactory.createAuthClient();
    }
    return client;
}

/**
 * Print the time that was spent on all tasks
 * @hours - count of hours
 */
export async function printUserHours(hours: number) : Promise<void>{    
    console.log(`Academic hours: ${hours} \nAstronomical hours: ${hours*2/3} \nCredits: ${hours/38}`)   
}

export async function loginMode() {
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

    console.log(`User: ${loginResponse.login? loginResponse.login: process.env.TAIGA_LOGIN}`);

    const client = await auth(loginResponse.login, loginResponse.password);
    if (client) {
        const myID = (await client.getMeContactDetail())?.id; 
        console.log((await client.getUserContactDetail(myID))?.username);

        if (myID) {
            const hours = await getUserAcademicHoursByID(client, myID);
            if (hours) {
                printUserHours(hours);
            } else {
                console.log('The user do not have any hours.');
            }
        } else {
            console.log('Error: The user does not exist.');
        }
        
    } else {
        console.log('Error: failed to log in.');
    }
}

export async function usernameMode() {
    const usernameResponse = await prompts({
        type: 'text',
        name: 'username',
        message: 'Input username: '
    });
    const username = usernameResponse.username;
    
    if (username) {
        console.log(`User: ${username? username: process.env.TAIGA_LOGIN}`);

        const client = TaigaClientFactory.createBaseClient();
        if (client) {
            const id = await getIdByUsername(client, username);

            if (id) {
                const hours = await getUserAcademicHoursByID(client, id);
                if (hours) {
                    printUserHours(hours);
                } else {
                    console.log('The user do not have any hours.');
                }
            } else {
                console.log('Error: The user does not exist.');
            }
            
        } else {
            console.log('Error: failed to create base client.');
        }    
    }
}

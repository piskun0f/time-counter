import { 
    TaigaBaseClient,
    TaigaAuthClient,
    TaigaClientFactory,
    Task
} from 'taigaio-client';

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
export async function getUserAcademicHoursByID(client: TaigaAuthClient, userId: number) : Promise<number|undefined> {
    let hours = 0;    
    if (client) {              
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
 * @param login - user login
 * @param password - user password
 * 
 * You can authorizes with .env file with structure:
 * TAIGA_URL=https://track.miem.hse.ru
 * TAIGA_LOGIN=login
 * TAIGA_PASSWORD=password
 */
export async function printUserHours(login?: string, password?: string) : Promise<void>{
    const client = await auth(login, password);

    if (client) {    
        let hours: number|undefined;
        const myID = (await client.getMeContactDetail())?.id;  
        if (myID) {
            hours = await getUserAcademicHoursByID(client, myID);
        } else {
            console.log('Error: failed to find you');
            return;
        }    

        if (hours) {
            console.log(`Academic hours: ${hours} \nAstronomical hours: ${hours*2/3} \nCredits: ${hours/38}`)
        } else {
            console.log('The user does not have any tasks');
        }        
    } else {
        console.log('Error: failed to log in');
    }
}


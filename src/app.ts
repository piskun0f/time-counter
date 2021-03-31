import prompts from 'prompts';
import {
    TaigaClient,
    ITaskDetail
} from 'taigaio-client';

async function getIdByUsername(client: TaigaClient, username: string) : Promise<number|undefined> {
    return (await client.getUserList())?.find((user: { username: string }) => {
        return user.username == username;
    })?.id;
}

/**
 * Get the time that was spent on this task
 * @param client - TaigaClient
 * @param task - task id
 * @returns task labor or undefined if the task doesn't exist
 */
export async function getTaskLabor(client: TaigaClient|TaigaClient, task: ITaskDetail) : Promise<number|undefined> {
    const customAttributes = await client.getTaskCustomAtributeList(task.project);

    if (customAttributes) {
        const labor = customAttributes.find(obj => {
            return obj.name == 'Трудозатраты';
        });

        if (labor) {
            const attributeValue = await client.getTaskCustomAtributeValueByTask(task.id);

            if (attributeValue) {
                return parseInt(attributeValue.attributes_values[labor.id.toString()]);
            }
        }
    }
    return undefined;
}

export interface TaskHours {
    subject: string
    hours: number
}
export interface UserHours {
    closedHours: number
    notClosedHours: number
    notClosedTasks: Array<TaskHours>
}

/**
 * Get the time that was spent on all tasks
 * @param client - Taiga
 * @returns - all users hours (academic = 40 min)
 */
export async function getUserAcademicHoursByID(client: TaigaClient, userId: number) : Promise<UserHours|undefined> {
    const result : UserHours = {
        closedHours: 0,
        notClosedHours: 0,
        notClosedTasks: []
    };
    const myTasks = await client.getTaskList({ assigned_to: userId });

    if (myTasks) {
        for (let i = 0; i < myTasks.length; i++) {
            const task = myTasks[i];
            if (task.is_closed) {
                const taskHours = await getTaskLabor(client, task);

                if (taskHours) {
                    result.closedHours += taskHours;
                }
            } else {
                const taskHours = await getTaskLabor(client, task);

                if (taskHours) {
                    const taskDetail = await client.getTask(task.id);
                    if (taskDetail) {
                        result.notClosedTasks.push({ subject: taskDetail.subject, hours: taskHours });
                    }
                    result.notClosedHours += taskHours;
                }
            }
        }
        return result;
    }

    return undefined;
}

/**
 * Get logined Taiga Client or undefiend if login or password invalid
 * @param login - user login
 * @param password - password
 * @returns - TaigaClient or undefined if user login or password is wrong
 *
 * You can authorizes with .env file with structure:
 * TAIGA_URL=yourTaigaSite
 * TAIGA_LOGIN=login
 * TAIGA_PASSWORD=password
 */
export async function createTaigaClient(login: string, password: string) : Promise<TaigaClient|undefined> {
    const client = new TaigaClient(process.env.TAIGA_URL ? process.env.TAIGA_URL : 'https://track.miem.hse.ru');
    const auth = await client.normalLogin(process.env.TAIGA_LOGIN ? process.env.TAIGA_LOGIN : login, process.env.TAIGA_PASSWORD ? process.env.TAIGA_PASSWORD : password);

    if (auth) {
        console.log(`User ${process.env.TAIGA_LOGIN ? process.env.TAIGA_LOGIN : login} logged in.`);
        return client;
    }
    console.log(`User ${process.env.TAIGA_LOGIN ? process.env.TAIGA_LOGIN : login} is not logged in.`);
    return undefined;
}

/**
 * Print the time that was spent on all tasks *
 */
export async function printUserHours(client: TaigaClient, id: number, username: string) : Promise<void> {
    const hours = await getUserAcademicHoursByID(client, id);
    if (hours) {
        console.log(`\nUser ${username}\n\nClosed:\nAcademic hours: ${hours.closedHours} \nAstronomical hours: ${hours.closedHours * 2 / 3} \nCredits: ${hours.closedHours / 38}`);
        console.log(`\nNot Closed:\nAcademic hours: ${hours.notClosedHours} \nAstronomical hours: ${hours.notClosedHours * 2 / 3} \nCredits: ${hours.notClosedHours / 38}`);
        if (hours.notClosedTasks.length != 0) {
            console.log('\nNot closed tasks:');
            hours.notClosedTasks.forEach(task => {
                console.log(`${task.subject} - ${task.hours}`);
            });
        }
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
            type: 'invisible',
            name: 'password',
            message: 'Input your password: '
        },
    ]);

    const login = loginResponse.login;
    const password = loginResponse.password;

    const client = await createTaigaClient(login, password);

    if (client) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            console.log('\n\n');
            const modeResponse = await prompts({
                type: 'number',
                name: 'mode',
                message: 'What do you want?\n1 - Find out how many hours I have\n2 - Find out how many hours someone else has\nENTER - exit\n'
            });

            if (modeResponse.mode == 1) {
                const myID = (await client.getMe())?.id;
                if (myID) {
                    console.log('Waiting please...');
                    await printUserHours(client, myID, login);
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
                    console.log('Waiting please...');
                    await printUserHours(client, id, username);
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

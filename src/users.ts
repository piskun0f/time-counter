import fs from 'fs';
import axios, { AxiosRequestConfig } from 'axios';

import './env';
import { createTaigaClient, getIdByUsername, getUserAcademicHoursByID } from './app';
import { TaigaClient } from 'taigaio-client';

interface UserInfo {
    email: string
    group: string
    hours: number
}

async function getGroup(email: string): Promise<string | undefined> {
    const config: AxiosRequestConfig = {
        headers: {
            'Authorization': 'Basic YWRwaXNrdW5vdkBtaWVtLmhzZS5ydTp5NDBnakVGM3F0bmFNeHZuOE80dVF3WjRHT01kM0FrNg=='
        }
    };
    try {
        const res = await axios.get(`https://chat.miem.hse.ru/api/v1/users/${email}?include_custom_profile_fields=true`, config);
        if (res.status == 200) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return res.data.user.profile_data['1'].value;
        }
    } catch {
        return undefined
    }
    return undefined
}

async function getUserHoursByEmail(client: TaigaClient, email: string): Promise<UserInfo | undefined> {
    const id = await getIdByUsername(client, email.slice(0, email.length - 12));
    const group = await getGroup(email)
    if (id) {
        const hours = await getUserAcademicHoursByID(client, id)
        if (hours) {
            return {
                email: email,
                group: group ? group : '',
                hours: hours.closedHours
            };
        }
    }
    return {
        email: email,
        group: group ? group : '',
        hours: 0
    }
}

(async () => {
    const login = process.env.TAIGA_LOGIN;
    const password = process.env.TAIGA_PASSWORD;
    if (login && password) {
        const client = await createTaigaClient(login, password);
        if (client) {
            const s = `email1@miem.hse.ru
email2@miem.hse.ru`;
            const arr = s.split('\n');

            const currTime = Date.now();

            if (fs.existsSync('users.txt')) {
                const file = fs.readFileSync('users.txt');
                const res = JSON.parse(file.toString());

                const groups = res.map((s: { group: string }) => {
                    if (s && s.group)
                        return s.group
                    return ''
                });
                const s = groups.join('\n');
                fs.writeFileSync('groups.txt', s);

                const hours = res.map((s: { hours: string }) => {
                    if (s)
                        return s.hours
                    return ''
                });
                const s1 = hours.join('\n');
                fs.writeFileSync('hours.txt', s1);
            } else {
                const res = [];
                for (const i of arr) {
                    const email = i.replace('edu.hse.ru', 'miem.hse.ru')
                    console.log(email)
                    res.push(await getUserHoursByEmail(client, email));
                }

                if (res) {
                    fs.writeFileSync('users.txt', JSON.stringify(res));
                }

                console.log((Date.now() - currTime));
            }

        }
    }
})().catch(console.log);

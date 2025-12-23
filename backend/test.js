import axios from 'axios';


async function fetchUser() {
    const response = await axios.get(
        "https://codeforces.com/api/user.info",
        {
            params : {
                handles: "Madroid_99"
            }
        }
    );

    const userinfo = response.data;
    console.log(userinfo);

    const user = userinfo.result[0]; 
    for (const [key, value] of Object.entries(user)) {
    console.log(key, ":", value);
}   
    
}

fetchUser();


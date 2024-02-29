
import { updateState, getState } from './taskpane/taskpane.js';
async function handlenewsletter(accessToken, mailList,folderName){

    const today = new Date().toISOString().split('T')[0];
    const folderUrl = `https://graph.microsoft.com/v1.0/me/mailFolders?$filter=displayName eq '${folderName}'`;
    const folderResponse = await fetch(folderUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!folderResponse.ok) {
        throw new Error(`Failed to retrieve the ${folderName} folder.`);
    }

    const folderData = await folderResponse.json();
    const newsletterFolder = folderData.value[0];
    var newsletterFolderId;
    if (!newsletterFolder) {
          console.log("Newletter folder getting created...");
            const url = 'https://graph.microsoft.com/v1.0/me/mailFolders';
            const body = {
                displayName: 'Newsletter'
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error('Failed to create the Newsletter folder.');
            }

            const data = await response.json();
            newsletterFolderId=data['id'];
            console.log("Id for newletter mailbox: "+newsletterFolderId);
    }
    else{
          newsletterFolderId = newsletterFolder.id;
        }

    // Build the filter query to retrieve emails from the folder received today
    const url = `https://graph.microsoft.com/v1.0/me/mailFolders/${newsletterFolderId}/messages?$filter=receivedDateTime ge ${today}T00:00:00Z and receivedDateTime le ${today}T23:59:59Z`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to retrieve emails from the ${folderName} folder.`);
    }

    const data = await response.json();
    const emails = data.value;
            mailList.forEach(async function(obj){
              var duplicateMail = emails.find(e => e.subject === obj.subject);
              if(!duplicateMail)
              { console.log("Moving emails to "+folderName);
                await moveMail(obj,accessToken,newsletterFolderId);
                const state = getState();
                if(folderName==="Newsletter")
                { console.log("Updating state object for increasing newsletter stat from "+state.newletter +" to "+(state.newletter+1));
                    updateState({newletter:state.newletter+1});
                }
                else{
                    console.log("Updating state object for increasing registration stat from "+state.registration +" to "+(state.registration+1));
                    updateState({registration:state.registration+1});
                }
              }
            });
}

async function moveMail(mail, accessToken,folderId){
        console.log("Mail id: "+mail.id);
        const moveResponse =  await fetch(`https://graph.microsoft.com/v1.0/me/messages/${mail.id}/move`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                destinationId: folderId
            })
        });

        if (!moveResponse.ok) {
            console.log(moveResponse.status);
            console.log(moveResponse);
            throw new Error('Failed to move the email to the folder.');
        }
        console.log('Email moved successfully to the folder.');

}

export {handlenewsletter, moveMail};
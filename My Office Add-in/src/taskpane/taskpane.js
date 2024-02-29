/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */
import {getHighImportanceMail} from "../flagMail";
import {handlenewsletter} from "../moveInFolder";
import {handleToDos, createReminder} from "../eventCreation";

// Declare a global object to store the state
let state = {
  highImp: 0,
  calendarItem: 0,
  registration: 0,
  newletter:0
};

export const updateState = (newState) => {
  state = { ...state, ...newState };
};

export const getState = () => state;

var printStatsIntervalId=0;
// Function to update the state
// function updateState(newData) {
//   Object.assign(state, newData);
// }

export function clearData(){
    updateState({newletter:0,
                calendarItem: 0,
                registration: 0,
                newletter:0
    });
    clearInterval(printStatsIntervalId);
    document.getElementById("item-subject").innerHTML = `<p><label id="item-subject">Enter Access token:</label></p>`;
    document.getElementById("password").value='';
}

Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    document.getElementById("sideload-msg").style.display = "none";
    document.getElementById("app-body").style.display = "flex";
    document.getElementById("run").onclick = run;
    document.getElementById("clear-data").onclick = clearData;
  }
});


export async function run() {
        document.getElementById("submitButton").addEventListener("click", function() {
            var password = document.getElementById("password").value;
            if(password=='' || password==null)
              { document.getElementById("show-stats").innerHTML=`No access token entered...`;}
            else{
                console.debug("User entered password:", password);
                fetchEmails(password);        
                 printStatsIntervalId= setInterval(printStats,1000);
            }
        });
}

function printStats(){
    document.getElementById("show-stats").innerHTML=`Here is today's stats...`
        document.getElementById("item-subject").innerHTML = ` <div id="item-subject">
    <ul style="padding-left: 20px; list-style-type: none;" class="ms-font-l">
        <li><span class="glyphicon glyphicon-calendar" style="color: #00BFFF;"></span> <span style="color: #333;">Reminders created:</span> ${state.calendarItem}</li>
        <li><span class="glyphicon glyphicon-exclamation-sign" style="color: #00BFFF;"></span> <span style="color: #333;">Emails flagged:</span> ${state.highImp}</li>
        <li><span class="glyphicon glyphicon-folder-open" style="color: #00BFFF;"></span> <span style="color: #333;">Registration mails received:</span> ${state.registration}</li>
        <li><span class="glyphicon glyphicon-bullhorn" style="color: #00BFFF;"></span> <span style="color: #333;">Newsletter mails received:</span> ${state.newletter}</li>
    </ul>
</div>`

}
 // Function to fetch emails from Microsoft Graph API
   async function fetchEmails(accessToken) {
  
        const today = new Date().toISOString().split('T')[0];
        getHighImportanceMail(accessToken);
        //  var apiUrl = `https://graph.microsoft.com/v1.0/me/messages?$filter=receivedDateTime ge ${today}T00:00:00Z and receivedDateTime le ${today}T23:59:59Z and isRead eq false and flag/flagStatus ne 'flagged'
        //  and (not (contains(body/content, 'Microsoft Teams meeting')))`;
        var apiUrl = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$filter=isRead eq false and flag/flagStatus ne 'flagged'
                     and importance ne 'high'`;
        var inputMails = [];

        $.ajax({
            url: apiUrl,
            type: "GET",
            headers: {
                "Authorization": "Bearer " + accessToken,
                "Content-Type": "application/json"
            },
            success: async function(response) {
                // Iterate through the emails and print the subject lines
                response.value.forEach(function(email) {
                    if(!('meetingMessageType' in email)){
                      var jsonMail = {
                          "subject": email.subject,
                          "content": email.bodyPreview,
                          "id":email.id
                      };
                      inputMails.push(jsonMail); 
                    }                                
                });
                console.log(inputMails);
                
                executePythonScript(inputMails,accessToken);
            },
            error: function(xhr, status, error) {
                // Handle error
                console.error("Error:", error);
            }
        });
    }
 function executePythonScript(data, accessToken) {
    fetch('http://localhost:5000/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(async result => {
            var todoResponse = result['To-do']; // Registration and To-do mapped here
            var newsletterResponse = result['Newsletter'];
            await handleToDos(accessToken, todoResponse);
            await handlenewsletter(accessToken, newsletterResponse,"Newsletter");
        })
        .catch(error => {
            console.error('Error calling Python script:', error);
        });

  }






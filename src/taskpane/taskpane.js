/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

import { async } from "regenerator-runtime";

// Declare a global object to store the state
var state = {
  highImp: 0,
  calendarItem: 0,
  registration: 0,
  newletter:0
};

var printStatsIntervalId=0;
// Function to update the state
function updateState(newData) {
  Object.assign(state, newData);
}

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
        var apiUrl = `https://graph.microsoft.com/v1.0/me/messages?$filter=isRead eq false and flag/flagStatus ne 'flagged'
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
            var todoResponse = result['To-do'];
            var newsletterResponse = result['Newletter'];
            await handleToDos(accessToken, todoResponse);
            await handlenewsletter(accessToken, newsletterResponse);
        })
        .catch(error => {
            console.error('Error calling Python script:', error);
        });

  }

async function handlenewsletter(accessToken, newsletterResponse){

    const today = new Date().toISOString().split('T')[0];
    const folderUrl = 'https://graph.microsoft.com/v1.0/me/mailFolders?$filter=displayName eq \'Newsletter\'';
    const folderResponse = await fetch(folderUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!folderResponse.ok) {
        throw new Error('Failed to retrieve the Newsletter folder.');
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

    // Build the filter query to retrieve emails from the "Newsletter" folder received today
    const url = `https://graph.microsoft.com/v1.0/me/mailFolders/${newsletterFolderId}/messages?$filter=receivedDateTime ge ${today}T00:00:00Z and receivedDateTime le ${today}T23:59:59Z`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to retrieve emails from the Newsletter folder.');
    }

    const data = await response.json();
    const emails = data.value;
            newsletterResponse.forEach(function(obj){
              var duplicateMail = emails.find(e => e.subject === obj.subject);
              if(!duplicateMail)
              {
                moveMail(obj,accessToken,newsletterFolderId);
                console.log("Updating state object for increasing newsletter stat from "+state.newletter +" to "+(state.newletter+1));
         
                updateState({newletter:state.newletter+1});
              }
            });
}

async function moveMail(mail, accessToken,folderId){
        console.log("Mail id: "+mail.id);
        const moveResponse = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${mail.id}/move`, {
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
            throw new Error('Failed to move the email to the folder.');
        }
        console.log('Email moved successfully to the folder.');

}

async function handleToDos(accessToken, todoResponse){
        let tableRows = '';
        var currentDate = new Date();
        todoResponse.forEach(function(obj) {
            const givenDate = new Date(obj['due-date']);
            var twoDaysBeforeDate = new Date(obj['due-date']);
            twoDaysBeforeDate.setDate(givenDate.getDate() - 2);
            if(obj['predicted-category']==='Registration'){
                updateState({registration:state.registration+1});
                 const tableData = `<td>${obj['subject']}</td>`; // Assuming each item is a string
                tableRows += `<tr>${tableData}</tr>`;
            }
            else if(obj['predicted-category']==='To-do'){
                if (twoDaysBeforeDate.getTime() > currentDate.getTime()) {
                                console.log('The date 2 days before is in the future.');
                                twoDaysBeforeDate.setHours(16,0,0,0);
                                var event = {
                                        subject: obj['subject'],
                                        content: obj['content'],
                                        id:obj['id'],
                                        date: twoDaysBeforeDate.getTime()
                                };
                                    createReminder(event, accessToken);
                } else if (twoDaysBeforeDate.getTime() < currentDate.getTime()) {
                                console.log('The date 2 days before is in the past.');
                                currentDate.setHours(16,0,0,0);
                                    var event = {
                                        subject: obj['subject'],
                                        content: obj['content'],
                                        id:obj['id'],
                                        date: currentDate.getTime()
                                    };
                                createReminder(event, accessToken);
                } else {
                                console.log('The date 2 days before is the same as the current date.');
                }
            }
            
          }); 
        if(tableRows !== ''){
            const tableHTML = `<table border="1">${tableRows}</table>`;
            var event = {
                            subject: "Today's Registrations!",
                            content: tableHTML,
                            date: currentDate.setHours(17,0,0,0)
                        };
            createReminder(event, accessToken);
        }
  }
function getHighImportanceMail(accessToken){
    const today = new Date().toISOString().split('T')[0];
        // var apiUrl = `https://graph.microsoft.com/v1.0/me/messages?$filter=importance eq 'high' and isFlagged eq false
        // receivedDateTime ge ${today}T00:00:00Z and receivedDateTime le ${today}T23:59:59Z &$select=subject,body`;
 var apiUrl = `https://graph.microsoft.com/v1.0/me/messages?$filter=importance eq 'high' and flag/flagStatus eq 'notFlagged'`;

        $.ajax({
            url: apiUrl,
            type: "GET",
            headers: {
                "Authorization": "Bearer " + accessToken,
                "Content-Type": "application/json"
            },
            success: function(response) {
                // Iterate through the emails and print the subject lines
                response.value.forEach(function(email) {
                    flagMail(email.id,accessToken);                 
                });                
            },
            error: function(xhr, status, error) {
                // Handle error
                console.error("Error:", error);
            }
        });
}

async function flagMail(mailId, accessToken){
      try {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${mailId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        flag: {
          flagStatus: 'flagged'
        }
      })
    });

    if (response.ok) {
      console.log('Email flagged successfully.');
      updateState({highImp:state.highImp+1});
    } else {
      const errorData = await response.json();
      console.error('Failed to flag email:', errorData);
    }
  } catch (error) {
    console.error('Error flagging email:', error);
  }
};

async function createReminder(calendarData,accessToken){
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = new Date(calendarData.date);
  date.setTime(date.getTime() + (15 * 60 * 1000)); // Add 15 minutes in milliseconds
  var contentType='';
  if(calendarData.subject ==="Today's Registrations!")
    contentType = 'html';
  else
    contentType='text';
  const event = {
        subject: 'Reminder: '+calendarData.subject,
        start: {
            dateTime:  new Date(calendarData.date), 
            timeZone: timeZone, 
        },
        end: {
            dateTime: date,
            timeZone: timeZone, 
        },
        reminderMinutesBeforeStart: 15,
        body: {
                contentType: contentType,
                content: `Email content:\n${calendarData.content}` // Include email content in the description
            }
    };
    console.log("Event object: ");
    console.log(event);
    const queryParams = new URLSearchParams({
            startDateTime: new Date(calendarData.date).toISOString(),
            endDateTime: new Date(calendarData.date).toISOString(),
        });
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        }
    });

    if (!response.ok) {
        throw new Error('Failed to retrieve events from the calendar.');
    }
    const events = await response.json();
    const existingEvent = events.value.find(e => e.subject === event.subject);

    if (!existingEvent) {
      try {
          const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(event),
          });

          if (response.ok) {
            console.log("Updating state object for increasing calendarItem stat from "+state.calendarItem +" to "+(state.calendarItem+1));
            updateState({calendarItem:state.calendarItem+1});
              console.log('Reminder created successfully.');
          } else {
              console.error('Failed to create reminder:', response.statusText);
          }
      } catch (error) {
          console.error('Error creating reminder:', error);
      }
  }
};

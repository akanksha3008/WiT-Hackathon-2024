
import { updateState, getState } from './taskpane/taskpane.js';
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
      const state = getState();
      updateState({highImp:state.highImp+1});
    } else {
      const errorData = await response.json();
      console.error('Failed to flag email:', errorData);
    }
  } catch (error) {
    console.error('Error flagging email:', error);
  }
};



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

export {flagMail, getHighImportanceMail};
# spotify-shuffler

CLI in progress.

In the mean time to run:
* Generate a clientId and clientSecret from spotify developer area of your account.
* Save these in a file called `creds.js` at the root of the repo that looks like this:
```
module.exports = {
    clientId: '<clientId>',
    clientSecret: '<clientSecret>'
};
```
* Add the callback url in the settings for your new app as `localhost:8888/callback`.
* Clone repo and cd into it then run `npm install`
* Run `node server`
* Navigate in your browser to `http://localhost:8888/authorize`
* Login to spotify and get a page with an object that includes "accessToken": "`<token>`"
* Copy the token into the below request where it says `<token>`. Put the playlist name in `<playlist name here>`.
* Send the request via terminal or api client, response will have the generated shuffled playlist name.

Request:
```
curl --request POST \
  --url http://localhost:8888/randomizePlaylist \
  --header 'authorization: Bearer <token>' \
  --header 'content-type: application/json' \
  --data '{
	"playlist": "<playlist name here>"
}'
```

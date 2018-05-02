# spotify-shuffler

CLI in progress.

In the mean time to run:
Generate a clientId and clientSecret from spotify developer area of your account.
Add the callback url in the settings for your new app as `localhost:8888/callback`.

`npm install`
`node server`
Navigate in your browser to `http://localhost:8888/authorize`
Login to spotify and get a page with an object that includes "accessToken": "<token>"
Copy the token into this request where it says <token>. Put the playlist name in <playlist name here>.
Send the request, response will have the generated shuffled playlist name.
```
curl --request POST \
  --url http://localhost:8888/randomizePlaylist \
  --header 'authorization: Bearer <token>' \
  --header 'content-type: application/json' \
  --data '{
	"playlist": "<playlist name here>"
}'
```

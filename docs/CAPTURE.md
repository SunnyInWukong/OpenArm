# Recording the demo GIF

The README shows `docs/demo.gif`. Here is how to record a good one in a couple of
minutes.

## Tool

Use [ScreenToGif](https://www.screentogif.com/) (free, Windows). Install it, or:

```powershell
winget install -e --id NickeManarin.ScreenToGif
```

## What to capture (aim for 15 to 25 seconds)

Run the app (`npm run dev`), then record this sequence so a first-time viewer sees
the whole point:

1. Drag the orange handle so the arm follows it (IK).
2. Click **+ Teach**, jog somewhere, **+ Teach** again.
3. Add a **MoveJ** and a **MoveL**, hit **Play** so the arm runs the path.
4. Import a CAD part and move the arm into it so a link turns red (collision).
5. Open the **Code** panel to show the generated URScript.

Keep it moving. Nobody watches a slow GIF to the end.

## Settings

- Capture just the app window, not the whole desktop.
- 12 to 15 fps is plenty and keeps the file small.
- Trim dead frames, then save as `docs/demo.gif`. Target under about 8 MB so it
  loads fast on GitHub.

Once `docs/demo.gif` exists, the README picks it up automatically. Commit it and
push.

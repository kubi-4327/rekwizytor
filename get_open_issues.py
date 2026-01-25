import json
import sys

# Since I can't pipe directly from the tool to the script easily without the tool output being a string I have to parse,
# I'll just write a script that I can use if I save the output to a file, 
# but better yet, I'll just use grep/jq if I had them.
# I'll just use python to read a hypothetical issues.json file.

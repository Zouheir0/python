import fs from 'node:fs';
const activity = (id,title,kind,concept,analogy,exampleCode,exampleOutput,task,starterCode,expectedOutput,hint,solutionCode,inputValues='',points=kind==='project'?40:15) => ({id,title,kind,concept,analogy,example_code:exampleCode,example_output:exampleOutput,task,starter_code:starterCode,expected_output:expectedOutput,hint,solution_code:solutionCode,input_values:inputValues,points});
const L=(id,title,c,a,ec,eo,t,sc,eo2,h,s,iv='')=>activity(id,title,'lesson',c,a,ec,eo,t,sc,eo2,h,s,iv,15);
const P=(id,title,c,a,ec,eo,t,sc,eo2,h,s,iv='')=>activity(id,title,'project',c,a,ec,eo,t,sc,eo2,h,s,iv,40);
const chapters = [
{ id:'c01',title:'Make Python talk',desc:'Start with output, quoted text, math, and the rules Python follows.',activities:[
L('c01-l01','Your first print()','print() tells Python to show something on the screen. The parentheses hold what you want to show.','Think of print() as asking a tiny robot to say something out loud.',`print("Hello, world!")`,'Hello, world!','Make the screen say: I wrote my first line!',`print("change this")`,'I wrote my first line!','Replace the words inside the quotes. Keep the matching quote marks.',`print("I wrote my first line!")`),
L('c01-l02','Math or text?','Without quotes, Python can calculate 2 + 5. With quotes, "2 + 5" is text. Quotes tell Python not to do the math.','A math expression is a recipe to calculate. A string is a note containing characters that happen to look like math.',`print(2 + 5)\nprint("2 + 5")`,'7\n2 + 5','Change the code so it prints the answer 7, not the characters 2 + 5.',`print("2 + 5")`,'7','Remove the quotes around 2 + 5. Keep print and its parentheses.',`print(2 + 5)`),
L('c01-l03','Capital letters matter','Python is case-sensitive. print and Print are different names. The built-in command is all lowercase: print. Names like score and Score can also be different.','Think of print and Print as two different passwords. One capital letter changes the spelling.',`print("small letters work")\nscore = 8\nScore = 2\nprint(score)\nprint(Score)`,'small letters work\n8\n2','Fix the code so it prints exactly: Python notices capitals.',`Print("Python notices capitals.")`,'Python notices capitals.','Use lowercase print. A capital P is not the same command.',`print("Python notices capitals.")`),
P('c01-p01','Project: Intro card','Combine text and math in a tiny introduction. Each print makes a new line. Text needs quotes; math does not.','It is like a mini poster built one line at a time.',`print("Name: Lina")\nprint("Favorite subject: science")\nprint(2 + 5)`,'Name: Lina\nFavorite subject: science\n7','Make a three-line card: name Noor, subject Art, and the answer to 10 + 4.',`print("Name: ")\nprint("Favorite subject: ")\nprint(0)`,'Name: Noor\nFavorite subject: Art\n14','Fill the first two strings, then replace 0 with 10 + 4.',`print("Name: Noor")\nprint("Favorite subject: Art")\nprint(10 + 4)`)
]},
{ id:'c02',title:'Store information',desc:'Give values names so your program can remember and reuse them.',activities:[
L('c02-l01','Create a variable','A variable is a name connected to a value. The single equals sign assigns the value on its right to the name on its left.','A variable is like a labelled box: score is the label and 12 is what is inside.',`score = 12\nprint(score)`,'12','Make a variable called stars with the value 5, then print it.',`stars = 0\nprint(stars)`,'5','Change the value after the equals sign. Do not put quotes around the number.',`stars = 5\nprint(stars)`),
L('c02-l02','Choose useful names','Names can use letters, numbers, and underscores, but cannot start with a number. Names cannot contain spaces. Python keywords such as if are reserved.','A useful variable name is a clear label. total_points tells you more than x.',`total_points = 24\nplayer_name = "Maya"\nprint(player_name)\nprint(total_points)`,'Maya\n24','Create game_level with the value 3 and print it.',`game_level = 1\nprint(game_level)`,'3','Keep the name exactly game_level and change its number to 3.',`game_level = 3\nprint(game_level)`),
L('c02-l03','Update a value','You can assign a new value to an existing variable. Python reads the right side first, then stores the result under the name on the left.','It is like crossing out the old number on a whiteboard and writing a new one.',`coins = 4\ncoins = coins + 3\nprint(coins)`,'7','Start with 10 points, add 6 more using the variable itself, and print 16.',`points = 10\npoints = points + 0\nprint(points)`,'16','Replace + 0 with + 6. Python uses the old value first.',`points = 10\npoints = points + 6\nprint(points)`),
P('c02-p02','Project: Score keeper','Use variables to store, update, and display a game score.','It is like keeping score in a notebook, but Python updates it for you.',`score = 10\nscore = score + 5\nprint(f"Score: {score}")`,'Score: 15','Make the starting score 7, add 8, and print Final score: 15.',`score = 0\nscore = score + 0\nprint(f"Final score: {score}")`,'Final score: 15','Set the first value to 7 and the added value to 8.',`score = 7\nscore = score + 8\nprint(f"Final score: {score}")`)
]},
{ id:'c03',title:'Numbers and math',desc:'Use arithmetic, parentheses, remainders, and rounding.',activities:[
L('c03-l01','Add and subtract','Use + to add and - to subtract. Python calculates numbers when they are not inside quotes.','The symbols work like the calculator you already know.',`print(9 + 4)\nprint(9 - 4)`,'13\n5','Print 30 minus 12.',`print(0 - 0)`,'18','Replace the zeros with 30 and 12.',`print(30 - 12)`),
L('c03-l02','Multiply and divide','Use * for multiplication and / for division. In Python, multiplication is an asterisk, not the letter x.','The computer uses keyboard-friendly symbols. * means times.',`print(6 * 7)\nprint(20 / 4)`,'42\n5.0','Print the result of 8 times 9.',`print(0 * 0)`,'72','Use * and numbers without quote marks.',`print(8 * 9)`),
L('c03-l03','Order of operations','Python follows math order: parentheses first, then powers, then multiplication and division, then addition and subtraction.','Parentheses are like saying, “Do this part first.”',`print(2 + 3 * 4)\nprint((2 + 3) * 4)`,'14\n20','Make Python calculate (6 + 2) times 3.',`print(6 + 2 * 3)`,'24','Put parentheses around 6 + 2.',`print((6 + 2) * 3)`),
L('c03-l04','Remainders with %','The % operator gives the remainder after division. 17 % 5 is 2 because 5 fits three times into 17 and 2 are left.','Imagine sharing 17 biscuits with 5 people. The remainder is what is left after equal groups.',`print(17 // 5)\nprint(17 % 5)`,'3\n2','Print the remainder when 23 is divided by 4.',`print(23 % 1)`,'3','Change the divisor from 1 to 4. Five groups use 20, leaving 3.',`print(23 % 4)`),
P('c03-p03','Project: Mini shop total','Calculate a shopping total using multiplication and addition.','A checkout multiplies item price by quantity, then adds prices together.',`apples = 3\napple_price = 2\nprint(apples * apple_price)`,'6','A notebook costs 4 and you buy 3. Print Total: 12.',`quantity = 0\nprice = 4\nprint(f"Total: {quantity * price}")`,'Total: 12','Use quantity 3 and keep price 4.',`quantity = 3\nprice = 4\nprint(f"Total: {quantity * price}")`)
]},
{ id:'c04',title:'Text and strings',desc:'Join text, change letter case, and put values inside messages.',activities:[
L('c04-l01','Text is called a string','A string is text surrounded by matching quotes. Python keeps the characters inside the quotes, including spaces and punctuation.','A string is a strip of text. Quote marks show where that strip starts and ends.',`print("coding is fun")\nprint('hello there')`,'coding is fun\nhello there','Print the exact text: I like Python!',`print("change me")`,'I like Python!','Replace the words inside the quotes. Keep the quote marks.',`print("I like Python!")`),
L('c04-l02','Join strings with +','The + operator joins two strings. This is called concatenation. It does not add a space automatically.','Tape two labels together. Add a space yourself if you want one between the words.',`print("Py" + "thon")\nprint("red" + " " + "fox")`,'Python\nred fox','Join code and time with a space between them.',`print("code" + "time")`,'code time','Add a string containing one space between the two words.',`print("code" + " " + "time")`),
L('c04-l03','Change text case','String methods such as .upper() and .lower() return text in a different letter case. The parentheses call the method.','It is like changing a sign from lowercase to uppercase.',`print("hello".upper())\nprint("PYTHON".lower())`,'HELLO\npython','Print learn in uppercase.',`print("learn")`,'LEARN','Add .upper() after the closing quote.',`print("learn".upper())`),
L('c04-l04','Build messages with f-strings','Put f before the opening quote, then place a variable or expression inside curly braces. Python replaces the braces with the value.','An f-string is a fill-in-the-blank sentence. Curly braces show where Python should put the answer.',`name = "Sam"\npoints = 12\nprint(f"{name} has {points} points")`,'Sam has 12 points','Use an f-string to print Ava is 14.',`name = "Ava"\nage = 14\nprint("Ava is age")`,'Ava is 14','Put f before the quote and {age} where the number should appear.',`name = "Ava"\nage = 14\nprint(f"{name} is {age}")`),
P('c04-p04','Project: Personalized badge','Build a name badge by combining strings, variables, and an f-string.','A name badge takes stored information and displays it in a readable format.',`nickname = "Coder"\nprint(f"Welcome, {nickname}!")`,'Welcome, Coder!','Make the output say Welcome, Rami! Level 2 using an f-string.',`nickname = "Rami"\nlevel = 2\nprint("Welcome")`,'Welcome, Rami! Level 2','Use f-string placeholders for nickname and level.',`nickname = "Rami"\nlevel = 2\nprint(f"Welcome, {nickname}! Level {level}")`)
]},
{ id:'c05',title:'Types and conversions',desc:'Learn the difference between numbers, text, and converting values.',activities:[
L('c05-l01','Numbers and text are different types','int means whole number, float means a number that may have a decimal, and str means text. type(value) tells you a value type.','The characters 12 and the number 12 look alike, but they behave differently.',`print(type(12))\nprint(type("12"))`,'<class \'int\'>\n<class \'str\'>','Print the type of 3.5.',`print(type(3))`,'<class \'float\'>','Use the decimal number 3.5.',`print(type(3.5))`),
L('c05-l02','Turn text into a number','int("12") converts numeric text to a whole number. float("3.5") converts numeric text to a decimal. Invalid text can cause ValueError.','Text saying 12 is like a label. Conversion changes it into a number Python can calculate with.',`age_text = "14"\nage = int(age_text)\nprint(age + 1)`,'15','Convert the text 8 to an integer, add 2, and print 10.',`number_text = "8"\nnumber = int(number_text)\nprint(number + 0)`,'10','Change + 0 to + 2. The conversion is already done.',`number_text = "8"\nnumber = int(number_text)\nprint(number + 2)`),
L('c05-l03','Turn a value into text','str(value) turns a value into text. This is useful when you want to join a number with a string using +.','You turn a number into printable writing before attaching it to a sentence.',`age = 14\nprint("Age: " + str(age))`,'Age: 14','Print Level 3 by joining the text Level and the number 3 converted to text.',`level = 3\nprint("Level " + str(level))`,'Level 3','Use str(level) so Python joins two strings.',`level = 3\nprint("Level " + str(level))`),
P('c05-p05','Project: Age next year','Use a text value, convert it to a number, then calculate next year’s age.','A form often gives you text, but math needs a number. Convert before calculating.',`age_text = "13"\nage = int(age_text)\nprint(age + 1)`,'14','The text is 15. Convert it and print Next year: 16.',`age_text = "15"\nage = int(age_text)\nprint(f"Next year: {age}")`,'Next year: 16','Add one to age inside the f-string.',`age_text = "15"\nage = int(age_text)\nprint(f"Next year: {age + 1}")`)
]},
{ id:'c06',title:'Ask the user for input',desc:'Make programs respond to information typed by the person running them.',activities:[
L('c06-l01','input() reads what someone types','input() pauses and returns the answer as text. Save the answer in a variable to use it later.','The program asks a question and waits for the person to reply.',`name = input("Name? ")\nprint(f"Hello, {name}!")`,'Name? Maya\nHello, Maya!','Ask for a name and greet the person. Test input is Noor.',`name = input("Name? ")\nprint(name)`,'Name? Noor\nHello, Noor!','Keep the question and change the second line to an f-string greeting.',`name = input("Name? ")\nprint(f"Hello, {name}!")`,'Noor'),
L('c06-l02','Convert input into a whole number','Input is text, even when the person types digits. Use int(input(...)) to read a whole number for calculations.','The user hands you a number written on paper; int() reads it as a number.',`age = int(input("Age? "))\nprint(age + 1)`,'Age? 14\n15','Ask for a number and print it multiplied by 2. Test input is 6.',`number = input("Number? ")\nprint(number)`,'Number? 6\n12','Wrap input in int(), then multiply by 2.',`number = int(input("Number? "))\nprint(number * 2)`,'6'),
L('c06-l03','Use float() for decimal input','Use float(input(...)) when someone may enter a decimal such as 2.5. Use int() for whole numbers.','A measuring scale can include fractions, so decimals need float().',`price = float(input("Price? "))\nprint(price * 2)`,'Price? 2.5\n5.0','Read a decimal and add 1.0. Test input is 3.5.',`amount = float(input("Amount? "))\nprint(amount)`,'Amount? 3.5\n4.5','Convert the input to float, then add 1.0.',`amount = float(input("Amount? "))\nprint(amount + 1.0)`,'3.5'),
P('c06-p06','Project: Snack order','Ask the person for a snack and how many they want, then show the order.','A simple order form asks for choices, stores them, then repeats them clearly.',`snack = input("Snack? ")\ncount = int(input("How many? "))\nprint(f"Order: {count} {snack}")`,'Snack? apple\nHow many? 3\nOrder: 3 apple','Make an order for 2 cookies. Use the provided two input lines.',`snack = input("Snack? ")\ncount = int(input("How many? "))\nprint("Order ready")`,'Snack? cookies\nHow many? 2\nOrder: 2 cookies','Use an f-string with both count and snack.',`snack = input("Snack? ")\ncount = int(input("How many? "))\nprint(f"Order: {count} {snack}")`,'cookies\n2')
]},
{ id:'c07',title:'True or False checks',desc:'Compare values and combine yes-or-no answers with Boolean logic.',activities:[
L('c07-l01','Comparisons answer a question','== checks whether values are equal. != checks whether they differ. <, >, <=, and >= compare sizes.','A comparison is like asking a yes-or-no question. Python answers with True or False.',`print(5 > 2)\nprint(5 == 2)`,'True\nFalse','Print whether 12 is at least 12.',`print(12 > 12)`,'True','Use >= because equal values count too.',`print(12 >= 12)`),
L('c07-l02','True and False use capitals','Python Boolean values are exactly True and False, with capital first letters. true and false are not the same names.','The capital letter is part of the exact spelling of these special values.',`ready = True\nprint(ready)\nprint(not ready)`,'True\nFalse','Create a Boolean called is_ready with the value True and print it.',`is_ready = False\nprint(is_ready)`,'True','Change False to True with a capital T.',`is_ready = True\nprint(is_ready)`),
L('c07-l03','Combine checks with and, or, not','and needs both checks to be true. or needs at least one check to be true. not flips a Boolean value.','A game door might require a key and a ticket. Another door might allow either one of two passes.',`print(True and False)\nprint(True or False)\nprint(not True)`,'False\nTrue\nFalse','Print True when score is 80 and it is between 60 and 100. Use and.',`score = 80\nprint(score >= 60)`,'True','Combine score >= 60 and score <= 100 with and.',`score = 80\nprint(score >= 60 and score <= 100)`),
P('c07-p07','Project: Game eligibility','Combine age and permission checks into a yes-or-no result.','A game can check two requirements before opening a level.',`age = 14\nhas_key = True\nprint(age >= 13 and has_key)`,'True','Check that score is at least 50 and the player has a pass. Use score 76 and has_pass True.',`score = 76\nhas_pass = True\nprint(score >= 50)`,'True','The final answer needs both the score comparison and has_pass.',`score = 76\nhas_pass = True\nprint(score >= 50 and has_pass)`)
]},
{ id:'c08',title:'Make decisions with if',desc:'Use if, elif, else, and indentation to choose what your program does.',activities:[
L('c08-l01','if runs code only when true','if condition: runs the indented block only when the condition is true. The colon starts the block and indentation shows which lines belong to it.','It is a rule: if it is raining, take an umbrella.',`score = 70\nif score >= 60:\n    print("Passed")`,'Passed','Print Ready only when energy is greater than 0.',`energy = 5\nif energy > 0:\n    print("Not ready")`,'Ready','Change the message to Ready. Keep print indented under if.',`energy = 5\nif energy > 0:\n    print("Ready")`),
L('c08-l02','else handles the other case','else runs when the if condition is false. It has a colon and no condition after it.','If the bus is here, get on; otherwise, wait.',`coins = 2\nif coins >= 3:\n    print("Buy it")\nelse:\n    print("Save coins")`,'Save coins','Use if/else to print Even when a number is even and Odd otherwise.',`number = 7\nif number % 2 == 0:\n    print("Odd")\nelse:\n    print("Odd")`,'Odd','The first message should be Even. Seven takes the else branch.',`number = 7\nif number % 2 == 0:\n    print("Even")\nelse:\n    print("Odd")`),
L('c08-l03','elif checks another possibility','elif means else if. Python checks conditions in order and runs only the first matching branch.','It is like checking a list of rules from top to bottom and stopping at the first that fits.',`score = 86\nif score >= 90:\n    print("A")\nelif score >= 80:\n    print("B")\nelse:\n    print("C")`,'B','For points 12, print Gold at 15 or more, Silver at 10 or more, otherwise Bronze.',`points = 12\nif points >= 15:\n    print("Gold")\nelif points >= 10:\n    print("Bronze")\nelse:\n    print("Bronze")`,'Silver','Change the second branch message to Silver.',`points = 12\nif points >= 15:\n    print("Gold")\nelif points >= 10:\n    print("Silver")\nelse:\n    print("Bronze")`),
P('c08-p08','Project: Adventure choice','Build a mini adventure that chooses a message based on the player’s health.','A game reacts differently depending on a player’s current state.',`health = 20\nif health > 0:\n    print("Keep going")\nelse:\n    print("Game over")`,'Keep going','Print Safe for health above 10, Careful for health above 0, and Game over for 0.',`health = 7\nif health > 10:\n    print("Safe")\nelif health > 0:\n    print("Game over")\nelse:\n    print("Game over")`,'Careful','Change the middle branch to Careful.',`health = 7\nif health > 10:\n    print("Safe")\nelif health > 0:\n    print("Careful")\nelse:\n    print("Game over")`)
]},
{ id:'c09',title:'Lists of things',desc:'Create lists, pick items by index, add items, and use built-in helpers.',activities:[
L('c09-l01','Make a list','A list stores several values in one ordered collection, using square brackets and commas.','A list is a row of slots. Each slot keeps one item in order.',`colors = ["red", "green", "blue"]\nprint(colors)`,'[\'red\', \'green\', \'blue\']','Make a list of 3, 5, and 8, then print it.',`numbers = [1, 2]\nprint(numbers)`,'[3, 5, 8]','Use square brackets and commas: [3, 5, 8].',`numbers = [3, 5, 8]\nprint(numbers)`),
L('c09-l02','Indexes start at zero','Use an index inside square brackets to get an item. The first index is 0, the second is 1, and so on.','The first seat in a Python queue has index zero.',`pets = ["cat", "dog", "fish"]\nprint(pets[0])\nprint(pets[2])`,'cat\nfish','Print the second item in animals = fox, owl, bear.',`animals = ["fox", "owl", "bear"]\nprint(animals[0])`,'owl','The second item uses index 1, not 2.',`animals = ["fox", "owl", "bear"]\nprint(animals[1])`),
L('c09-l03','Append and count items','append(item) adds one item to the end of a list. len(list) counts its items.','Appending is placing another card at the end of the row. len counts the cards.',`tasks = ["read", "draw"]\ntasks.append("code")\nprint(len(tasks))`,'3','Append sleep to [eat, play] and print the full list.',`tasks = ["eat", "play"]\ntasks.append("code")\nprint(tasks)`,'[\'eat\', \'play\', \'sleep\']','Change the appended item to sleep.',`tasks = ["eat", "play"]\ntasks.append("sleep")\nprint(tasks)`),
L('c09-l04','Use sum() and sorted()','sum(numbers) adds a numeric list. sorted(items) makes a sorted list and leaves the original list unchanged.','sum is like adding every score. sorted puts the cards in order.',`scores = [3, 9, 4]\nprint(sum(scores))\nprint(sorted(scores))`,'16\n[3, 4, 9]','Print the total of [2, 4, 6], then its sorted list.',`values = [2, 4, 6]\nprint(sum(values))\nprint(values)`,'12\n[2, 4, 6]','Add print(sorted(values)) after the sum.',`values = [2, 4, 6]\nprint(sum(values))\nprint(sorted(values))`),
P('c09-p09','Project: Playlist manager','Store a short playlist, add a song, and show the list length.','A playlist is a collection you can grow and count.',`songs = ["Intro", "Sunrise"]\nsongs.append("Finale")\nprint(len(songs))`,'3','Create songs Sky and Ocean, append Stars, then print the list and its length.',`songs = ["Sky"]\nsongs.append("Stars")\nprint(songs)`,'[\'Sky\', \'Ocean\', \'Stars\']\n3','Start with both Sky and Ocean, append Stars, then print the list and its length.',`songs = ["Sky", "Ocean"]\nsongs.append("Stars")\nprint(songs)\nprint(len(songs))`)
]},
{ id:'c10',title:'Repeat with for loops',desc:'Make Python repeat a task without copying the same line many times.',activities:[
L('c10-l01','Loop through a list','A for loop runs its indented block once for each item in a list. The loop variable takes the current item each time.','A loop is like going through a checklist and doing the same action for every row.',`for fruit in ["apple", "pear", "plum"]:\n    print(fruit)`,'apple\npear\nplum','Print each number in [2, 4, 6] on its own line.',`for number in [1, 2]:\n    print(number)`,'2\n4\n6','Replace the list with [2, 4, 6].',`for number in [2, 4, 6]:\n    print(number)`),
L('c10-l02','Count with range()','range(5) gives 0, 1, 2, 3, 4. The stop value is not included. range(1, 5) gives 1, 2, 3, 4.','range is a number ticket dispenser that stops just before the ending number.',`for number in range(1, 4):\n    print(number)`,'1\n2\n3','Print 1, 2, 3, 4 using range().',`for number in range(1, 3):\n    print(number)`,'1\n2\n3\n4','The stop number should be 5 because it is excluded.',`for number in range(1, 5):\n    print(number)`),
L('c10-l03','Keep a running total','A variable can collect a running total. Give it a starting value before the loop, then update it each time.','A running total is like a cash register adding each item as it passes.',`total = 0\nfor value in [2, 3, 4]:\n    total = total + value\nprint(total)`,'9','Use a loop to add 1, 2, and 3, then print 6.',`total = 0\nfor value in [1, 2, 3]:\n    total = total + value\nprint(total)`,'6','This starter has the right pattern. Make sure the total prints after the loop.',`total = 0\nfor value in [1, 2, 3]:\n    total = total + value\nprint(total)`),
P('c10-p10','Project: Multiplication table','Use a loop to print multiplication facts in a predictable pattern.','A loop fills out each row in a table without repeated code.',`for number in range(1, 4):\n    print(number * 3)`,'3\n6\n9','Print 5, 10, 15, 20 by multiplying numbers 1 through 4 by five.',`for number in range(1, 3):\n    print(number * 5)`,'5\n10\n15\n20','Use range(1, 5) so the loop visits 1, 2, 3, and 4.',`for number in range(1, 5):\n    print(number * 5)`)
]},
{ id:'c11',title:'While loops and loop control',desc:'Repeat while a condition is true and learn how to stop safely.',activities:[
L('c11-l01','Repeat while true','A while loop repeats while its condition is true. Update the variable inside the loop so the condition can eventually become false.','It is like saying “keep going while the timer is above zero.”',`count = 1\nwhile count <= 3:\n    print(count)\n    count = count + 1`,'1\n2\n3','Print 1 and 2 using a while loop.',`count = 1\nwhile count <= 1:\n    print(count)\n    count = count + 1`,'1\n2','Change <= 1 to <= 2 so it can reach 2.',`count = 1\nwhile count <= 2:\n    print(count)\n    count = count + 1`),
L('c11-l02','Avoid an infinite loop','An infinite loop never reaches a stopping condition. If the condition is always true and nothing changes it, the program can run forever.','It is like walking in a circle without a plan to stop.',`count = 0\nwhile count < 3:\n    print(count)\n    count += 1`,'0\n1\n2','Make the loop print 0, 1, 2 and stop.',`count = 0\nwhile count < 3:\n    print(count)`,'0\n1\n2','Update count inside the loop, for example with count += 1.',`count = 0\nwhile count < 3:\n    print(count)\n    count += 1`),
L('c11-l03','break and continue','break exits a loop early. continue skips the rest of the current turn and moves to the next one.','break is an emergency exit. continue skips to the next page in a checklist.',`for number in range(1, 6):\n    if number == 4:\n        break\n    print(number)`,'1\n2\n3','Print 1, 2, and 4, skipping 3 with continue.',`for number in range(1, 5):\n    print(number)`,'1\n2\n4','Add an if number == 3 block with an indented continue before print.',`for number in range(1, 5):\n    if number == 3:\n        continue\n    print(number)`),
P('c11-p11','Project: Countdown','Use a while loop to count down and finish with Launch!.','A countdown repeats while the number is above zero.',`count = 3\nwhile count > 0:\n    print(count)\n    count -= 1\nprint("Go!")`,'3\n2\n1\nGo!','Make a countdown from 4 to 1 and then print Launch!.',`count = 2\nwhile count > 0:\n    print(count)\n    count -= 1\nprint("Go!")`,'4\n3\n2\n1\nLaunch!','Start at 4 and change the final message to Launch!.',`count = 4\nwhile count > 0:\n    print(count)\n    count -= 1\nprint("Launch!")`)
]},
{ id:'c12',title:'Write reusable functions',desc:'Put a named set of instructions in one place and call it whenever you need it.',activities:[
L('c12-l01','Define a function','Use def name(): to define a function. The indented lines form its body. The body does not run until the function is called.','A function is a named recipe card. Writing the recipe is not the same as cooking it.',`def say_hi():\n    print("Hi!")\nsay_hi()`,'Hi!','Define cheer() so it prints You can do it!, then call it.',`def cheer():\n    print("change this")\ncheer()`,'You can do it!','Change the message inside the function.',`def cheer():\n    print("You can do it!")\ncheer()`),
L('c12-l02','Call a function more than once','After a function is defined, you can call it many times using its name and parentheses.','Once you have a recipe, you can cook it more than once without rewriting it.',`def clap():\n    print("Clap!")\nclap()\nclap()`,'Clap!\nClap!','Call wave() twice so Hello! prints twice.',`def wave():\n    print("Hello!")\nwave()`,'Hello!\nHello!','Add a second call to wave() on a new line.',`def wave():\n    print("Hello!")\nwave()\nwave()`),
L('c12-l03','Indent the function body','Python uses indentation to show which instructions belong to the function. Bad indentation can cause an error.','The function body is like recipe steps under the recipe title.',`def greet():\n    print("Welcome")\n    print("Ready?")\ngreet()`,'Welcome\nReady?','Make start_game() print Start and Play fair on separate lines.',`def start_game():\nprint("Start")\n    print("Play fair")\nstart_game()`,'Start\nPlay fair','Indent both print lines by four spaces.',`def start_game():\n    print("Start")\n    print("Play fair")\nstart_game()`),
P('c12-p12','Project: Reusable cheer','Write one function and use it several times.','Instead of copying a message, you call your named recipe.',`def cheer():\n    print("Great job!")\ncheer()`,'Great job!','Create level_up() that prints Level up!, then call it twice.',`def level_up():\n    print("change")\nlevel_up()`,'Level up!\nLevel up!','Change the message and add a second function call.',`def level_up():\n    print("Level up!")\nlevel_up()\nlevel_up()`)
]},
{ id:'c13',title:'Functions with inputs and results',desc:'Give functions parameters and send information back with return.',activities:[
L('c13-l01','Parameters receive values','A parameter is a name in the function definition. The argument is the real value passed when you call the function.','A function with a parameter is like a machine with an input slot.',`def greet(name):\n    print(f"Hello, {name}!")\ngreet("Ava")`,'Hello, Ava!','Make the function greet the name Noor.',`def greet(name):\n    print(f"Hello, {name}!")\ngreet("Sam")`,'Hello, Noor!','Change the argument inside greet(...) from Sam to Noor.',`def greet(name):\n    print(f"Hello, {name}!")\ngreet("Noor")`),
L('c13-l02','return sends a result back','return sends a value back to the code that called the function. You can use the result in a variable or another expression.','A function can be a calculator: it takes inputs and hands back an answer.',`def double(number):\n    return number * 2\nanswer = double(6)\nprint(answer)`,'12','Write triple(number) that returns number times 3. Call it with 4 and print 12.',`def triple(number):\n    return number\nprint(triple(4))`,'12','Change the return line so it multiplies number by 3.',`def triple(number):\n    return number * 3\nprint(triple(4))`),
L('c13-l03','return is not print','print displays a value. return sends a value back to the caller. A function can return a result without displaying it.','print is a loudspeaker; return passes a note back to whoever asked.',`def add(a, b):\n    return a + b\nresult = add(2, 3)\nprint(result)`,'5','Create area(width, height) that returns width times height. Print area(3, 4).',`def area(width, height):\n    return 0\nprint(area(3, 4))`,'12','Return the product width * height.',`def area(width, height):\n    return width * height\nprint(area(3, 4))`),
P('c13-p13','Project: Discount calculator','Create a function that calculates a price after a discount.','A reusable calculator keeps the formula in one place.',`def half(price):\n    return price / 2\nprint(half(10))`,'5.0','Write discounted(price) that returns price minus 3. Print the result for 12.',`def discounted(price):\n    return price\nprint(discounted(12))`,'9','Subtract 3 from price in the return expression.',`def discounted(price):\n    return price - 3\nprint(discounted(12))`)
]},
{ id:'c14',title:'Dictionaries',desc:'Store related information using named keys instead of numeric indexes.',activities:[
L('c14-l01','Create a dictionary','A dictionary stores key-value pairs inside curly braces. A key such as name helps you find its value.','A dictionary is like a contact card: the label name points to the person’s name.',`player = {"name": "Mia", "level": 3}\nprint(player["name"])`,'Mia','Create a dictionary with key color and value blue, then print the value.',`item = {"color": "red"}\nprint(item["color"])`,'blue','Change the value from red to blue. Keep the key color the same.',`item = {"color": "blue"}\nprint(item["color"])`),
L('c14-l02','Add or change a value','Assign to dictionary[key] to add a new pair or replace a value stored under that key.','A dictionary lets you update information on a named card.',`player = {"score": 10}\nplayer["score"] = 15\nprint(player["score"])`,'15','Change the score to 25 and print it.',`player = {"score": 10}\nplayer["score"] = 10\nprint(player["score"])`,'25','Assign 25 to player["score"].',`player = {"score": 10}\nplayer["score"] = 25\nprint(player["score"])`),
L('c14-l03','Use get() for a safe default','get(key, default) returns a default value when the key is missing. Direct lookup with a missing key raises KeyError.','A default is a backup answer when a dictionary has no entry for a key.',`settings = {"sound": True}\nprint(settings.get("music", False))`,'False','Print unknown as the default for a missing pet key.',`profile = {"name": "Noor"}\nprint(profile.get("pet", "cat"))`,'unknown','Change the fallback string from cat to unknown.',`profile = {"name": "Noor"}\nprint(profile.get("pet", "unknown"))`),
P('c14-p14','Project: Player profile','Build and update a game profile with related values.','One dictionary stores information about a player in a clear structure.',`player = {"name": "Mia", "level": 2}\nplayer["level"] = 3\nprint(f"{player['name']} level {player['level']}")`,'Mia level 3','Make a profile for Kai at level 4, then print Kai level 4.',`player = {"name": "Kai", "level": 1}\nprint(player["name"])`,'Kai level 4','Use an f-string that reads both dictionary values.',`player = {"name": "Kai", "level": 4}\nprint(f"{player['name']} level {player['level']}")`)
]},
{ id:'c15',title:'Errors and debugging',desc:'Read error messages, check assumptions, and handle expected problems.',activities:[
L('c15-l01','Read the error name first','SyntaxError means code cannot be understood. NameError means a name was not found. TypeError means an operation does not fit the value type.','An error message is a clue from the computer, not a grade. Start by reading its name and line number.',`print("hello")\nprint(10 / 0)`,'hello\nZeroDivisionError: division by zero','Fix this program so it prints 5.0 instead of dividing by zero.',`print(10 / 0)`,'5.0','Use division by 2 instead of 0. Python’s / operator produces a decimal-style float.',`print(10 / 2)`),
L('c15-l02','Fix a NameError','Names must be spelled consistently and defined before use. score and Score are different because Python notices capitals.','A name is like a contact saved under an exact spelling. One wrong letter points to nobody.',`score = 7\nprint(score)`,'7','Fix the code so it prints 9 without a NameError.',`points = 9\nprint(pointS)`,'9','The name in print must exactly match points.',`points = 9\nprint(points)`),
L('c15-l03','Fix a TypeError','A TypeError happens when an operation does not make sense for the types. For example, joining text and an integer needs conversion or an f-string.','You cannot add an apple to a number on a calculator. Convert or choose an operation that fits.',`age = 14\nprint("Next year: " + str(age + 1))`,'Next year: 15','Fix this so it prints Next year: 15.',`age = 14\nprint("Next year: " + age + 1)`,'Next year: 15','Convert the numeric result to text with str(...) or use an f-string.',`age = 14\nprint("Next year: " + str(age + 1))`),
L('c15-l04','Handle an expected error','A try block contains code that might fail. An except block describes what to do if a matching error happens.','try/except is like having a backup plan for a predictable problem.',`try:\n    number = int("12")\n    print(number)\nexcept ValueError:\n    print("Please use digits")`,'12','Try converting hello and print Please use digits if it causes ValueError.',`try:\n    number = int("7")\n    print(number)\nexcept ValueError:\n    print("Try again")`,'Please use digits','Change 7 to hello and change the error message.',`try:\n    number = int("hello")\n    print(number)\nexcept ValueError:\n    print("Please use digits")`),
P('c15-p15','Project: Safe number reader','Build a number reader that handles non-number input without crashing.','Good programs plan for mistakes people can make while typing.',`try:\n    number = int("cat")\nexcept ValueError:\n    print("That is not a number")`,'That is not a number','Attempt to convert oops to int. On ValueError, print Invalid number.',`try:\n    number = int("5")\n    print(number)\nexcept ValueError:\n    print("Try again")`,'Invalid number','Use oops and change the except message.',`try:\n    number = int("oops")\n    print(number)\nexcept ValueError:\n    print("Invalid number")`)
]},
{ id:'c16',title:'Tools and bigger ideas',desc:'Use modules, solve simple data problems, and build your own objects.',activities:[
L('c16-l01','Import math','import math makes the math module available. You can use math.sqrt() to calculate a square root.','A module is a toolbox. Importing it gives you access to tools someone already built.',`import math\nprint(math.sqrt(81))`,'9.0','Use math.sqrt to print the square root of 144.',`import math\nprint(math.sqrt(9))`,'12.0','Replace 9 with 144.',`import math\nprint(math.sqrt(144))`),
L('c16-l02','Count matching items','A loop and an if can count how many items match a rule. Start the counter at zero and increase it when the rule is true.','It is like checking each answer and adding a tally for each match.',`numbers = [2, 5, 8, 3]\ncount = 0\nfor number in numbers:\n    if number % 2 == 0:\n        count += 1\nprint(count)`,'2','Count how many numbers are greater than 5 in [2, 8, 9, 1].',`numbers = [2, 8, 9, 1]\ncount = 0\nfor number in numbers:\n    if number > 2:\n        count += 1\nprint(count)`,'2','Change the condition to number > 5. Eight and nine match.',`numbers = [2, 8, 9, 1]\ncount = 0\nfor number in numbers:\n    if number > 5:\n        count += 1\nprint(count)`),
L('c16-l03','Make a simple class','A class describes a kind of object. An object can store information in attributes and provide actions through methods.','A class is a blueprint. Objects are things built from that blueprint.',`class Pet:\n    pass\npet = Pet()\nprint(type(pet).__name__)`,'Pet','Create a class named Robot, make one object, and print its type name.',`class Robot:\n    pass\nbot = Robot()\nprint(type(bot).__name__)`,'Robot','The class name and __name__ should both be Robot.',`class Robot:\n    pass\nbot = Robot()\nprint(type(bot).__name__)`),
P('c16-p16','Project: Pet simulator','Use a class to store a pet’s name and happiness, then change its happiness with a method.','The object keeps both the pet’s details and actions it can perform.',`class Pet:\n    def __init__(self, name):\n        self.name = name\n        self.happiness = 0\n    def play(self):\n        self.happiness += 1\npet = Pet("Milo")\npet.play()\nprint(f"{pet.name}: {pet.happiness}")`,'Milo: 1','Create pet Luna, play twice, and print Luna: 2.',`class Pet:\n    def __init__(self, name):\n        self.name = name\n        self.happiness = 0\n    def play(self):\n        self.happiness += 1\npet = Pet("Luna")\npet.play()\nprint(f"{pet.name}: {pet.happiness}")`,'Luna: 2','Call pet.play() a second time.',`class Pet:\n    def __init__(self, name):\n        self.name = name\n        self.happiness = 0\n    def play(self):\n        self.happiness += 1\npet = Pet("Luna")\npet.play()\npet.play()\nprint(f"{pet.name}: {pet.happiness}")`)
]}
];
const chapterDescriptions = {
  "c01": "Wake up Python by printing messages, spotting quotes, and making simple calculations.",
  "c02": "Build a score counter by giving values names Python can remember and update.",
  "c03": "Power a mini shop and game scoreboard with arithmetic, multiplication, and remainders.",
  "c04": "Create player cards and messages with text tools and fill-in-the-blank f-strings.",
  "c05": "Teach a program the difference between text and numbers, then convert between them.",
  "c06": "Make tiny interactive programs that ask questions and respond to typed answers.",
  "c07": "Give a game simple rules by comparing values and combining yes-or-no checks.",
  "c08": "Make your program choose what happens next with if, elif, and else.",
  "c09": "Build a playlist that stores, finds, adds, and sorts items.",
  "c10": "Automate repetitive jobs with for loops, number ranges, and running totals.",
  "c11": "Create reliable countdowns and learn how to stop loops safely.",
  "c12": "Turn repeated instructions into reusable functions.",
  "c13": "Build calculator functions that accept information and return answers.",
  "c14": "Create player profiles with named keys and values.",
  "c15": "Become a debugging detective and teach programs to handle expected mistakes.",
  "c16": "Use Python's math toolbox, count patterns in data, and build a tiny pet object."
};
const activityOverrides = {
  "c01-l01": {
    "task": "You are waking up a tiny coding robot. Make it announce: I wrote my first line!"
  },
  "c01-l03": {
    "concept": "Python pays attention to capital letters. Its built-in command is spelled print, all lowercase; Print is a different name and will not work.",
    "analogy": "A capital letter is like changing one letter in a password: the spelling no longer matches.",
    "example_code": "print(\"small letters work\")",
    "example_output": "small letters work",
    "task": "Fix the one-letter bug so the robot says exactly: Python notices capitals."
  },
  "c02-l02": {
    "concept": "A variable name can use letters, digits, and underscores, but cannot start with a digit or contain spaces. Pick a clear label such as game_level, then spell it the same way every time.",
    "analogy": "A useful variable name is a clear label. game_level tells you more than a mystery name like x."
  },
  "c02-p02": {
    "title": "Quest: Power-up scorekeeper",
    "concept": "A score is just a number stored under a name. Set the starting score, add the points you collect, and print the result. This quest uses variables and addition only.",
    "analogy": "Your score is a game counter: each new batch of points gets added to the old total.",
    "example_code": "score = 10\nscore = score + 5\nprint(score)",
    "example_output": "15",
    "task": "You start with 7 stars and collect 8 more. Make Python calculate and print your final total: 15.",
    "starter_code": "score = 0\nscore = score + 0\nprint(score)",
    "expected_output": "15",
    "hint": "Set the starting score to 7, then add 8. The last line prints the number stored in score.",
    "solution_code": "score = 7\nscore = score + 8\nprint(score)"
  },
  "c03-p03": {
    "title": "Quest: Mini shop checkout",
    "concept": "A checkout multiplies the number of items by the price of one item. Store each number in a variable, then print the total. We are practising math here; message formatting comes later.",
    "analogy": "The till does the same calculation each time: quantity multiplied by price.",
    "example_code": "apples = 3\napple_price = 2\nprint(apples * apple_price)",
    "example_output": "6",
    "task": "A game shop sells a badge for 4 coins. You buy 3 badges. Calculate the total and print 12.",
    "starter_code": "quantity = 0\nprice = 4\nprint(quantity * price)",
    "expected_output": "12",
    "hint": "Set quantity to 3. Keep price at 4, then let * calculate the total.",
    "solution_code": "quantity = 3\nprice = 4\nprint(quantity * price)"
  },
  "c04-p04": {
    "title": "Quest: Make a player badge",
    "task": "Create a badge that says Welcome, Rami! Level 2. Use the name and level variables so Python fills in the details."
  },
  "c05-p05": {
    "title": "Quest: Age-up calculator"
  },
  "c06-p06": {
    "title": "Quest: Snack shop order"
  },
  "c07-p07": {
    "title": "Quest: Unlock the game"
  },
  "c08-p08": {
    "title": "Quest: Choose your adventure"
  },
  "c09-p09": {
    "title": "Quest: Playlist builder"
  },
  "c10-p10": {
    "title": "Quest: Multiplication machine"
  },
  "c11-p11": {
    "title": "Quest: Rocket countdown",
    "example_code": "count = 3\nwhile count > 0:\n    print(count)\n    count = count - 1\nprint(\"Go!\")",
    "starter_code": "count = 2\nwhile count > 0:\n    print(count)\n    count = count - 1\nprint(\"Go!\")",
    "solution_code": "count = 4\nwhile count > 0:\n    print(count)\n    count = count - 1\nprint(\"Launch!\")"
  },
  "c12-p12": {
    "title": "Quest: Level-up cheer"
  },
  "c13-p13": {
    "title": "Quest: Discount calculator"
  },
  "c14-p14": {
    "title": "Quest: Player profile",
    "example_code": "player = {\"name\": \"Mia\", \"level\": 2}\nplayer[\"level\"] = 3\nname = player[\"name\"]\nlevel = player[\"level\"]\nprint(f\"{name} level {level}\")",
    "example_output": "Mia level 3",
    "task": "Build Kai's player profile at level 4, then print Kai level 4. Store the dictionary values in simple variables before building the message.",
    "starter_code": "player = {\"name\": \"Kai\", \"level\": 1}\nname = player[\"name\"]\nlevel = player[\"level\"]\nprint(f\"{name} level {level}\")",
    "expected_output": "Kai level 4",
    "hint": "Set the dictionary level to 4. Read player[\"name\"] and player[\"level\"] into name and level, then use those names in the f-string.",
    "solution_code": "player = {\"name\": \"Kai\", \"level\": 4}\nname = player[\"name\"]\nlevel = player[\"level\"]\nprint(f\"{name} level {level}\")"
  },
  "c15-p15": {
    "title": "Quest: Safe number reader"
  },
  "c16-p16": {
    "title": "Quest: Pet simulator",
    "concept": "A class is the blueprint; each pet is an object made from it. __init__ sets up a new pet, self.name and self.happiness store that pet's details, and play() changes its happiness.",
    "analogy": "Think of a pet object as a virtual pet card with its own name, happiness meter, and play button.",
    "example_code": "class Pet:\n    def __init__(self, name):\n        self.name = name\n        self.happiness = 0\n    def play(self):\n        self.happiness = self.happiness + 1\npet = Pet(\"Milo\")\npet.play()\nprint(f\"{pet.name}: {pet.happiness}\")",
    "example_output": "Milo: 1",
    "task": "Create pet Luna, press its play action twice, and print Luna: 2.",
    "starter_code": "class Pet:\n    def __init__(self, name):\n        self.name = name\n        self.happiness = 0\n    def play(self):\n        self.happiness = self.happiness + 1\npet = Pet(\"Luna\")\npet.play()\nprint(f\"{pet.name}: {pet.happiness}\")",
    "expected_output": "Luna: 2",
    "hint": "The pet starts at happiness 0. Each pet.play() adds 1, so call it one more time before printing.",
    "solution_code": "class Pet:\n    def __init__(self, name):\n        self.name = name\n        self.happiness = 0\n    def play(self):\n        self.happiness = self.happiness + 1\npet = Pet(\"Luna\")\npet.play()\npet.play()\nprint(f\"{pet.name}: {pet.happiness}\")"
  },
  "c07-l02": {
    "example_code": "ready = True\nprint(ready)",
    "example_output": "True"
  },
  "c09-l04": {
    "title": "Sort the scoreboard",
    "concept": "sum(values) adds all the numbers. sorted(values) gives you a new list in order; it does not rearrange the original list.",
    "analogy": "sum is the scoreboard total; sorted is the neat ranking list.",
    "example_code": "scores = [3, 9, 4]\nprint(sum(scores))\nprint(sorted(scores))",
    "example_output": "16\n[3, 4, 9]",
    "task": "A scoreboard contains [2, 4, 6]. Print its total, then print the numbers in sorted order.",
    "starter_code": "values = [6, 2, 4]\nprint(sum(values))\nprint(values)",
    "expected_output": "12\n[2, 4, 6]",
    "hint": "Keep the total line. In the second print, use sorted(values) instead of values.",
    "solution_code": "values = [6, 2, 4]\nprint(sum(values))\nprint(sorted(values))"
  },
  "c10-l03": {
    "starter_code": "total = 0\nfor value in [1, 2, 4]:\n    total = total + value\nprint(total)",
    "expected_output": "6",
    "hint": "The list should contain 1, 2, and 3. The loop adds each value into total, so the final print happens after the loop."
  },
  "c11-l02": {
    "example_code": "count = 0\nwhile count < 3:\n    print(count)\n    count = count + 1",
    "starter_code": "count = 0\nwhile count < 3:\n    print(count)",
    "expected_output": "0\n1\n2",
    "hint": "After printing, increase count with count = count + 1. That moves it toward 3 so the loop can stop.",
    "solution_code": "count = 0\nwhile count < 3:\n    print(count)\n    count = count + 1"
  },
  "c16-l02": {
    "example_code": "numbers = [2, 5, 8, 3]\ncount = 0\nfor number in numbers:\n    if number % 2 == 0:\n        count = count + 1\nprint(count)",
    "starter_code": "numbers = [2, 8, 9, 1]\ncount = 0\nfor number in numbers:\n    if number > 2:\n        count = count + 1\nprint(count)",
    "expected_output": "2",
    "solution_code": "numbers = [2, 8, 9, 1]\ncount = 0\nfor number in numbers:\n    if number > 5:\n        count = count + 1\nprint(count)"
  }
};
const walkthroughs = {
  "c01-l01": [
    "print(...) is the instruction that displays something. The parentheses hold what you want Python to show.",
    "The quote marks wrap the exact text; the quote marks themselves do not appear in the output."
  ],
  "c01-l02": [
    "Without quotes, 2 + 5 is a calculation, so Python prints 7.",
    "With quotes, Python treats 2 + 5 as text and prints those characters instead."
  ],
  "c01-l03": [
    "Python's built-in command is spelled print with a lowercase p.",
    "Changing that p to P creates a different name, so Python cannot find the command."
  ],
  "c01-p01": [
    "Each print(...) instruction writes one line, so three print calls make a three-line card.",
    "Text goes inside quotes; the final number can be a calculation without quotes."
  ],
  "c02-l01": [
    "stars = 5 stores the number 5 under the name stars.",
    "print(stars) looks up the stored value. Do not put quotes around the variable name."
  ],
  "c02-l02": [
    "The left side is the label; the right side is the value to remember.",
    "Underscores can join words in a name, but spaces cannot. Use exactly the same spelling when you print it."
  ],
  "c02-l03": [
    "The first line stores 10 in points.",
    "The next line reads the old points value, adds 6, and stores the new total. That is why the result is 16."
  ],
  "c02-p02": [
    "Set score to 7 first, then update it by adding 8 to the existing score.",
    "print(score) displays the number. This quest sticks to variables and arithmetic; formatted messages are taught later."
  ],
  "c03-l01": [
    "The + symbol adds, and the - symbol subtracts.",
    "Each print(...) runs its calculation and displays the answer on a new line."
  ],
  "c03-l02": [
    "Use * for multiplication; the keyboard letter x is not the multiplication operator.",
    "The / symbol divides. Python may show the result as a decimal such as 5.0."
  ],
  "c03-l03": [
    "Python follows the usual math order: multiplication happens before addition.",
    "Parentheses make the part inside happen first, changing (6 + 2) * 3 to 24."
  ],
  "c03-l04": [
    "// counts complete groups, while % gives what is left over.",
    "23 divided into groups of 4 leaves a remainder of 3, so 23 % 4 is 3."
  ],
  "c03-p03": [
    "quantity stores how many badges you buy, and price stores the price of one badge.",
    "quantity * price calculates the full cost. Print the number first; formatted messages are taught in Chapter 4."
  ],
  "c04-l01": [
    "Text in Python is called a string and sits between matching quote marks.",
    "The characters inside the quotes—including spaces and punctuation—are printed exactly as written."
  ],
  "c04-l02": [
    "The + operator joins strings together instead of adding their characters as numbers.",
    "Python does not insert a space for you, so join in a string containing one space when you need it."
  ],
  "c04-l03": [
    "A dot connects a string to a method, such as .upper() or .lower().",
    "The method runs because of the parentheses and returns a changed version of the text."
  ],
  "c04-l04": [
    "The f before the opening quote tells Python to fill in placeholders.",
    "Put a variable inside curly braces, like {age}; Python replaces the braces with its current value."
  ],
  "c04-p04": [
    "The f-string is the message template; {nickname} and {level} are fill-in-the-blank spots.",
    "Keep the regular text and punctuation outside the braces, and the variable names inside them."
  ],
  "c05-l01": [
    "12 is an int, 3.5 is a float, and \"12\" is a str (text).",
    "type(value) asks Python what kind of value it is; the quotation marks change the type."
  ],
  "c05-l02": [
    "Numeric text needs converting before it can be used for arithmetic. int(\"8\") makes the number 8.",
    "Once it is a number, Python can add 2 to produce 10."
  ],
  "c05-l03": [
    "str(level) turns the number into text.",
    "The + operator can then join that text to another string such as \"Level \". This is one way to build a message."
  ],
  "c05-p05": [
    "age_text starts as text, so int(age_text) converts it into a whole number.",
    "The f-string inserts the result of age + 1 into the sentence."
  ],
  "c06-l01": [
    "input(\"Name? \") pauses and collects the typed answer as text.",
    "The answer is stored in name, and the f-string places that answer after Hello."
  ],
  "c06-l02": [
    "input() always returns text—even when the person types digits.",
    "int(input(...)) converts that text to a whole number before multiplication."
  ],
  "c06-l03": [
    "float(input(...)) turns a typed decimal such as 3.5 into a number.",
    "Adding 1.0 gives 4.5; use float for decimals and int for whole numbers."
  ],
  "c06-p06": [
    "The first input stores the snack name; the second is converted to a number with int(...).",
    "The f-string combines count and snack in one readable order message."
  ],
  "c07-l01": [
    "A comparison such as 5 > 2 asks a yes-or-no question.",
    "Python prints True when the comparison is correct and False when it is not."
  ],
  "c07-l02": [
    "Boolean values are written exactly as True and False, with capital first letters.",
    "Store the value in is_ready, then print the variable name without quotes."
  ],
  "c07-l03": [
    "and is True only when both checks are True; or needs at least one True check.",
    "not flips a Boolean answer. The checks can be combined into one rule."
  ],
  "c07-p07": [
    "score >= 50 checks the points requirement; has_pass already stores True or False.",
    "and makes both requirements necessary, so a player needs enough points and a pass."
  ],
  "c08-l01": [
    "if checks the condition; the colon starts the block of instructions.",
    "The indented print line belongs to the if and runs only when energy > 0 is True."
  ],
  "c08-l02": [
    "The if branch runs when the condition is True; else covers every other case.",
    "The % 2 == 0 check is True for an even number and False for an odd number."
  ],
  "c08-l03": [
    "Python checks if first, then each elif in order, and stops at the first match.",
    "Put the highest threshold first so 12 earns Silver, not Bronze."
  ],
  "c08-p08": [
    "The first matching condition chooses the message for the player's health.",
    "Order the checks from greater than 10, to greater than 0, then the final else for zero."
  ],
  "c09-l01": [
    "Square brackets create a list, and commas separate its items.",
    "print(numbers) displays the whole list, including the brackets."
  ],
  "c09-l02": [
    "List positions, called indexes, start at 0 rather than 1.",
    "So the second item is at index 1: animals[1]."
  ],
  "c09-l03": [
    "append(\"sleep\") adds a new item to the end of the existing list.",
    "len(tasks) counts the items. Print tasks when you want to inspect the list itself."
  ],
  "c09-l04": [
    "sum(values) adds every number in the list.",
    "sorted(values) returns a newly ordered list; print(values) keeps the original order, which is why the starter fails."
  ],
  "c09-p09": [
    "The list stores songs in order, and append adds Stars at the end.",
    "len(songs) counts all songs after the new one is added."
  ],
  "c10-l01": [
    "The for line takes one item from the list at a time and stores it in number.",
    "The indented print runs once per item, producing one output line for each number."
  ],
  "c10-l02": [
    "range(1, 5) starts at 1 and stops before 5.",
    "That means number takes 1, 2, 3, and 4, one value per loop turn."
  ],
  "c10-l03": [
    "Start total at 0 before the loop begins.",
    "Each loop turn adds one list value to total; print after the loop to see the final sum."
  ],
  "c10-p10": [
    "range(1, 5) produces four loop values: 1, 2, 3, and 4.",
    "Multiplying each value by 5 produces 5, 10, 15, and 20 without repeating four print lines."
  ],
  "c11-l01": [
    "while repeats as long as count <= 2 remains True.",
    "Adding 1 during each turn eventually makes the condition False, so the loop stops."
  ],
  "c11-l02": [
    "The loop checks count < 3 before each turn.",
    "Without count = count + 1, count stays 0 forever. Updating it lets the condition become False."
  ],
  "c11-l03": [
    "break exits the loop completely; continue skips to the next turn.",
    "Place the continue check before print so number 3 is skipped but 4 still prints."
  ],
  "c11-p11": [
    "The countdown begins at 4, prints the current value, then subtracts 1.",
    "When count reaches 0 the loop ends, and the final Launch! message prints afterward."
  ],
  "c12-l01": [
    "def cheer(): defines a reusable set of instructions; it does not run the body yet.",
    "The line cheer() calls the function, so Python enters the indented body and prints the message."
  ],
  "c12-l02": [
    "The function body is written once under def clap():.",
    "Each call clap() runs those instructions again, so two calls produce two messages."
  ],
  "c12-l03": [
    "The colon ends the function header and starts its body.",
    "Both print lines need the same four-space indentation to belong to start_game()."
  ],
  "c12-p12": [
    "Write the cheer once inside level_up().",
    "Call level_up() twice outside the indented block to get two lines without copying the message."
  ],
  "c13-l01": [
    "name is a parameter: a placeholder filled when greet(...) is called.",
    "greet(\"Noor\") passes Noor into that placeholder, and the f-string inserts it into the message."
  ],
  "c13-l02": [
    "return number * 3 sends the calculated value back to whoever called triple().",
    "print(triple(4)) displays the returned answer, 12."
  ],
  "c13-l03": [
    "return sends a value back; print displays a value on the screen.",
    "area(3, 4) should return width multiplied by height, and the outer print displays 12."
  ],
  "c13-p13": [
    "discounted(price) receives the price when called.",
    "Subtract 3 inside return so discounted(12) sends 9 back to print."
  ],
  "c14-l01": [
    "A dictionary stores key-value pairs inside curly braces.",
    "player[\"name\"] looks up the value attached to the key name."
  ],
  "c14-l02": [
    "player[\"score\"] selects the value stored under score.",
    "Assigning a new number to that same key replaces its old value."
  ],
  "c14-l03": [
    "get(\"pet\", \"unknown\") checks for a pet key.",
    "Because the key is missing, get returns the backup value unknown instead of raising a KeyError."
  ],
  "c14-p14": [
    "The dictionary keeps related player details under name and level.",
    "Read each value into a simple variable, then let the f-string build the final message."
  ],
  "c15-l01": [
    "Read the last line of an error first; it gives the error type and a useful clue.",
    "Dividing by zero raises ZeroDivisionError. Changing the divisor fixes this particular crash."
  ],
  "c15-l02": [
    "points is the name that was created.",
    "pointS has a capital S, so it is a different name. Use the exact same spelling."
  ],
  "c15-l03": [
    "age is an integer, and \"Next year: \" is text; Python cannot join them directly with +.",
    "Convert the number with str(...) or use an f-string once you know that pattern."
  ],
  "c15-l04": [
    "Python tries the instructions inside try first.",
    "If int(\"hello\") raises ValueError, Python jumps to the matching except block and prints a helpful message."
  ],
  "c15-p15": [
    "int(\"oops\") cannot turn those letters into a number, so it raises ValueError.",
    "The except ValueError block catches that expected problem and prints Invalid number instead of stopping the program."
  ],
  "c16-l01": [
    "import math loads Python's math toolbox.",
    "math.sqrt(144) asks that toolbox for the square root of 144, which is 12.0."
  ],
  "c16-l02": [
    "The loop checks each number, and the if condition decides whether it matches.",
    "Increase count only inside the matching branch, then print the final count after the loop."
  ],
  "c16-l03": [
    "class Robot: defines a blueprint; bot = Robot() creates one object from it.",
    "pass is a temporary placeholder because this first class has no instructions inside yet."
  ],
  "c16-p16": [
    "__init__ runs when Pet(\"Luna\") creates the object and stores its name and starting happiness.",
    "Each pet.play() call adds 1 to that pet's happiness. Call it twice before printing the final value."
  ]
};
for (const chapter of chapters) {
  chapter.desc = chapterDescriptions[chapter.id] || chapter.desc;
  for (const item of chapter.activities) {
    Object.assign(item, activityOverrides[item.id] || {});
    item.walkthrough = walkthroughs[item.id] || [];
    item.chapter_id = chapter.id; item.chapter_title = chapter.title;
    item.example_output = String(item.example_output).replace(/\r\n/g, '\n').replace(/\n+$/g, '');
    item.expected_output = String(item.expected_output).replace(/\r\n/g, '\n').replace(/\n+$/g, '');
  }
}
fs.writeFileSync(new URL('./curriculum.json', import.meta.url), JSON.stringify({version:1,chapters}, null, 2));
console.log(`Wrote ${chapters.length} chapters, ${chapters.reduce((n,c)=>n+c.activities.length,0)} coding activities.`);

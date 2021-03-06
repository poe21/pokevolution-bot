// MODULES
var Botkit = require('botkit');
var request = require('request');
var Pokedex = require('pokedex-promise-v2');

// POKEDEX CONSTRUCTOR
var P = new Pokedex();

// CONFIG
var controller = Botkit.facebookbot({
  access_token: process.env.page_access_token,
  verify_token: process.env.verify_token,
});

// BOT SPAWN
var bot = controller.spawn({
});

// SERVER
controller.setupWebserver(process.env.PORT, function(err,webserver) {
  controller.createWebhookEndpoints(controller.webserver, bot, function() {
    console.log('This bot is online!!!');
  });
});

// MONITORING MIDDLEWARE
controller.middleware.receive.use(function(bot, message, next) {
  console.log(userCurrentGame, 'userCurrentGame')
  console.log(userPokedex, 'userPokedex')
  next();
})


var pokemonList = null;

// POKEMON LIST
request('https://pokeapi.co/api/v2/pokemon', function (err, result) {
  if (!err) {
    var data = JSON.parse(result.body);
    var url = 'https://pokeapi.co/api/v2/pokemon/?limit=' + data.count;
    
    request(url, function (err, result) {
      if (!err) {
        data = JSON.parse(result.body); 
        pokemonList = data.results;
      } else {
        console.log('there was an error: ' + err); // verify
      }
    });
  } else {
    console.log('there was an error: ' + err); // verify
  }
});

// MENUS

var mainMenu = {
  'type':'template',
  'payload':{
    'template_type':'generic',
    'elements':[
      {
        'title': 'What can I help you with?',
        'buttons': [
          {
          'type':'postback',
          'title':'Search for a Pokémon',
          'payload':'search'
          },
          {
          'type':'postback',
          'title':'Search for a type',
          'payload':'search-type'
          },
          {
          'type':'postback',
          'title':'More options',
          'payload':'moreoptions-button'
          }
        ]
      }
    ]
  }
};

var mainMenuNext = {
  'type':'template',
  'payload':{
    'template_type':'generic',
    'elements':[
      {
        'title': 'What can I help you with?',
        'buttons': [
          {
          'type':'postback',
          'title':'Set my Pokédex',
          'payload':'pokedexmenu'
          },
          {
          'type':'postback',
          'title':'Help section',
          'payload':'help'
          },
          {
          'type':'postback',
          'title':'That\'s all for now',
          'payload':'thatsall-button'
          }
        ]
      }
    ]
  }
};

var pokedexMenu = {
  'type':'template',
  'payload':{
    'template_type':'generic',
    'elements':[
      {
        'title': 'What would you like to do?',
        'buttons': [
          {
          'type':'postback',
          'title':'Use National Pokédex',
          'payload':'default'
          },
          {
          'type':'postback',
          'title':'Use game Pokédex',
          'payload':'set-pokedex'
          },
          {
          'type':'postback',
          'title':'Keep current Pokédex',
          'payload':'keep-pokedex'
          }
        ]
      }
    ]
  }
};

var newSearchMenu = {
  'type':'template',
  'payload':{
    'template_type':'generic',
    'elements':[
      {
        'title': 'Would you like to do another search?',
        'buttons': [
          {
          'type':'postback',
          'title':'Search for a Pokémon',
          'payload':'search'
          },
          {
          'type':'postback',
          'title':'See main menu',
          'payload':'mainmenu-button'
          },
          {
          'type':'postback',
          'title':'That\'s all for now',
          'payload':'thatsall-button'
          }
        ]
      }
    ]
  }
};


// MENUS HANDLER

controller.on('facebook_postback', function(bot, message) {
  var currentGameName;
  
  if (userCurrentGame[message.user]) {
    currentGameName = userCurrentGame[message.user].name.split('-').join(' ');
  }
  
  var messageSplit = message.payload.split('*');
  var onButtonPress = messageSplit[0];
  
  if (messageSplit.length === 4) {
    var pokemonName = messageSplit[1];
    var pokemonChainUrl = messageSplit[2];
    var displayName = messageSplit[3];
  } else if (messageSplit.length === 3) {
    var chosenPokedexUrl = messageSplit[1];
    var chosenPokedexName = messageSplit[2];
  }
  
  if (onButtonPress === 'evolution-button') {
    bot.reply(message, 'No problem, hold on a second!');
    getEvolutionChain(bot, message, pokemonName, pokemonChainUrl, displayName);
  } 
  else if (onButtonPress === 'search') {
    searchPokemon(bot, message);
  } 
  else if (onButtonPress === 'thatsall-button') {
    bot.reply(message, 'Ok, tell me if you need my help again!');
    return;
  } 
  else if (onButtonPress === 'mainmenu-button') {
    bot.reply(message, {attachment: mainMenu});
  } 
  else if (onButtonPress === 'moreoptions-button') {
    bot.reply(message, {attachment: mainMenuNext});
  } 
  else if (onButtonPress === 'search-type') {
    getType(bot, message);
  } 
  else if (onButtonPress === 'pokedexmenu') {
    bot.startConversation(message, function(err, convo) {
      if (!err) {
        stateCurrentPokedex(bot, message, convo);
        convo.say({attachment: pokedexMenu});
      } else {
        console.log('there was an error: ' + err); // verify
        return;
      }
    });
  }
  else if (onButtonPress === 'set-pokedex') {
    findGame(bot, message);
  } 
  else if (onButtonPress === 'keep-pokedex') {
    bot.startConversation(message, function(err, convo) {
      if (!err) {
        convo.say('No problem!');
        convo.say({attachment: mainMenu});
      } else {
        bot.reply(message, 'error'); // verify
        return;
      }
    });
  }
  else if (onButtonPress === 'default') {
    if (userPokedex[message.user]) {
      delete userPokedex[message.user];
      bot.startConversation(message, function(err, convo) {
        if (!err) {
          convo.say('Alright, you are now using the National Pokédex.');
          convo.say({attachment: mainMenu});
        } else {
          bot.reply(message, 'error'); // verify
          return;
        }
      });
    } else {
      bot.startConversation(message, function(err, convo) {
        if (!err) {
          convo.say('You are already using the National Pokédex!');
          convo.say({attachment: mainMenu});
        } else {
          bot.reply(message, 'error'); // verify
          return;
        }
      });
    }
  }
  else if (onButtonPress === 'help') {
    sendHelp(bot, message);
  }
  else if (onButtonPress === 'pokedexchoice') {
    userPokedex[message.user] = [ { url: chosenPokedexUrl, name: chosenPokedexName } ];
    console.log(userPokedex[message.user])
    
    bot.startConversation(message, function(err, convo) {
      if (!err) {
        convo.say('Pokédex now set to ' + capitalizeFirst(splitJoin(chosenPokedexName)) + '.');
        convo.say({attachment: mainMenu});
      } else {
        bot.reply(message, 'error'); // verify
        return;
      }
    });
  }
});


// SAY CURRENT POKEDEX

function stateCurrentPokedex(bot, message, convo) {
  var currentGameName = null;
  if (userCurrentGame[message.user]) {
    currentGameName = userCurrentGame[message.user].name.split('-').join(' ');
  }
  
  if (userPokedex[message.user]) {
    var name = userPokedex[message.user][0].name;
    convo.say('You are currently using the Pokédex for Pokémon ' + displayGameName(currentGameName) + ': ' + capitalizeFirst(splitJoin(name)) + '.');
  } else {
    convo.say('You are currently using the National Pokédex.');
  }
}


// HELLO FUNCTION

var userFirstRun = {};

controller.hears(['^hello$', '^hi$', '^yo$', '^hey$', 'what\'s up'], 'message_received', function(bot, message) {  // NOTE: Change dialog, add user nickname question linked with database
  if (!userFirstRun[message.user]) {
    userFirstRun[message.user] = 'done';
    bot.startConversation(message, function(err, convo) {
      if (!err) {
        convo.say('Hey there, Pokémon trainer. :) Nice to meet you! I am your assistant Pokédex. Feel free to browse through my menus, or say "help" if you want to know more!');
        stateCurrentPokedex(bot, message, convo);
        convo.say({attachment: mainMenu});
      } else {
        bot.reply(message, 'error'); // verify
        return;
      }
    });
  } else {
    bot.startConversation(message, function(err, convo) {
      if (!err) {
        convo.say('Hello, nice to see you again! :)');
        stateCurrentPokedex(bot, message, convo);
        convo.say({attachment: mainMenu});
      } else {
        bot.reply(message, 'error'); // verify
        return;
      }
    });
  }
});


// HELP SECTION

controller.hears('^help$', 'message_received', sendHelp);
  
function sendHelp(bot, message) {
  var convoArray = ['I heard that you want to know more about me? :) \nI am a bot made to assist Pokémon trainers like you, on a quest to catch \'em all! ☺', 'I can find any Pokémon through any Pokédex of a given game, and tell you about its evolution trigger and conditions. When prompted for a Pokémon, try to say "Squirtle" or "Pikachu" ❤️, for example. Or any number between 1 and 721!', 'I can also tell you what type is good against another. Try searching for types like "fire", "psychic" or "electric"! ⚡ \n\nKeep in mind that I understand only the English version of the Pokémon names and types.', 'All my functions are available through my main menu. Though you can also call them by saying things like "pokemon" or "type". \n\nGreeting me will bring up the main menu as well. ☎ If you need a reminder, don\'t hesitate to say "help"! ☺', {attachment: mainMenu}]

  bot.reply(message, convoArray[0]);
  
  setTimeout(function() {
    bot.reply(message, convoArray[1]);
  }, 4000)
  
  setTimeout(function() {
    bot.reply(message, convoArray[2]);
  }, 12000)
  
  setTimeout(function() {
    bot.reply(message, convoArray[3]);
  }, 19000)
  
  setTimeout(function() {
    bot.reply(message, convoArray[4]);
  }, 25000)
}


// WHICH GAME: Finding which game the user is playing for pokedex entry numbers

var userCurrentGame = {};
var userPokedex = {};

controller.hears(['game', '^pokedex$', '^pokédex$'], 'message_received', findGame);

function findGame(bot, message) {
  bot.startConversation(message, function(err, convo) {
    if (!err) {
      if (!userCurrentGame[message.user]) {
        convo.ask('Which game are you currently playing?', function(response, convo) {
          var userAnswer = response.text.toLowerCase();
          
          // if 'pokemon' is in the answer, remove it
          if (userAnswer.indexOf('pokemon') !== -1) {
            userAnswer = userAnswer.split('pokemon ')[1];
          } else if (userAnswer.indexOf('pokémon') !== -1) {
            userAnswer = userAnswer.split('pokémon ')[1];
          }
          
          // REGEXP (to avoid having another game/multiple games as a result ('black' instead of 'black 2', etc.))
          if (userAnswer === 'y') { 
            userAnswer = /\sy$/;
          } else if (userAnswer === 'x') {
            userAnswer = /^x\s/;
          } else if (userAnswer === 'ruby') {
            userAnswer = /^ruby\s/;
          } else if (userAnswer === 'red') {
            userAnswer = /^red\s/;
          } else if (userAnswer === 'gold') {
            userAnswer = /^gold\s/;
          } else if (userAnswer === 'silver') {
            userAnswer = /\ssilver$/;
          } else if (userAnswer === 'white') {
            userAnswer = /\swhite$/;
          } else if (userAnswer === 'sapphire') {
            userAnswer = /^ruby sapphire$/;
          } else if (userAnswer === 'black') {
            userAnswer = /^black white$/;
          }
          
          // Fetching game info
          request('https://pokeapi.co/api/v2/version-group/', function (err, result) {
            if (!err) {
              var resultObject = JSON.parse(result.body);
              var versionGroup = resultObject.results;
              var gameFound = false;
              var counter = versionGroup.length;
              
              // loop over each available game
              versionGroup.forEach(function(version) {
                var currentGameName = version.name.split('-').join(' ');
                counter--;
                console.log(currentGameName);
                
                // compare user answer to available games. if found, save infos for that game
                if (currentGameName.search(userAnswer) !== -1 && currentGameName !== 'colosseum' && currentGameName !== 'xd') {    // ignoring Colosseum and XD
                  console.log('found! here is the url: ' + version.url);
                  gameFound = true;
                  userCurrentGame[message.user] = version;
                }
              });
              
              // if game infos saved
              if (userCurrentGame[message.user]) {
                getPokedex(bot, message);  // call next function
              } else if (gameFound === false && counter === 0) {
                bot.reply(message, 'Sorry, I couldn\'t find the game that you requested.');
                bot.reply(message, {attachment: mainMenu});
              }
            } else {
              bot.reply(message, 'server error'); // verify
              return;
            }
          });
          convo.stop();
        });
      } else {
        delete userCurrentGame[message.user];
        convo.stop();
        findGame(bot, message);
      }
    } else {
      bot.reply(message, 'error'); // verify, use convo.stop(); instead of return??
      return;
    }
  });
}


// GET POKEDEX for the current game

function getPokedex(bot, message) {
  var currentGameName = userCurrentGame[message.user].name.split('-').join(' ');
  
  // requesting game version
  request(userCurrentGame[message.user].url, function(err, result) {
    if (!err) {
      var resultObject = JSON.parse(result.body);
      var pokedexes = resultObject.pokedexes;
      console.log(pokedexes, 'pokedexes')
      
      // if only 1 pokedex available for that game
      if (pokedexes.length === 1) {
        userPokedex[message.user] = pokedexes;   // assign pokedex to user
        bot.startConversation(message, function(err, convo) {
          if (!err) {
            convo.say('You are currently playing Pokémon ' + displayGameName(currentGameName) + '. Pokédex now set to ' + capitalizeFirst(splitJoin(pokedexes[0].name)) + '.');
            convo.say({attachment: mainMenu});
          } else {
            bot.reply(message, 'error'); // verify
            return;
          }
        });
      } 
      // if multiple pokedexes available for one game
      else if (pokedexes.length > 1) {
        var pokedexButtons = [];
        
        pokedexes.forEach(function(pokedex) {
          var pokedexName = capitalizeFirst(splitJoin(pokedex.name));
          var button = {
            type:'postback',
            title: pokedexName,
            payload:'pokedexchoice*' + pokedex.url + '*' + pokedex.name
          };
          pokedexButtons.push(button);
        });
        
        var pokedexChoice = {
          'type':'template',
          'payload':{
            'template_type':'generic',
            'elements':[
              {
                'title': 'Which Pokédex should I use?',
                'buttons': pokedexButtons
              }
            ]
          }
        }; 
        
        bot.startConversation(message, function(err, convo) {
          if (!err) {
            convo.say('You are currently playing Pokémon ' + displayGameName(currentGameName) + '.');
            convo.say('I have found multiple available Pokédex for this game.');
            convo.say({attachment: pokedexChoice});
          } else {
            bot.reply(message, 'error'); // verify
            return;
          }
        });
      }
    } else {
      bot.reply(message, 'error'); // verify
      return;
    }
  });
}


// WHICH POKEMON ?

controller.hears(['^pokemon$', '^pokémon$', '^search$'], 'message_received', searchPokemon);

function searchPokemon(bot, message) {
  bot.startConversation(message, function(err, convo) {
    if (!err) {
      convo.ask('Which Pokémon would you like to know more about? Say its name or Pokédex entry number.', function(response, convo) {
        bot.reply(message, 'Alright, please wait while I look through my files.');
        
        var chosenPokemon = response.text;
        // note to future self: make up for people entering things like '#025', 'number 25', 'pokemon no. 25', etc.
        
        var chosenPokemonId;
        var chosenPokemonName;
        
        // checking if a name or an ID number was entered
        if (chosenPokemon.match(/^[^0-9]+$/)) {
          if (chosenPokemon.toLowerCase().indexOf('mega') !== -1) {
            var splitChosenPokemon = chosenPokemon.toLowerCase().split(' ');
            chosenPokemonName = megaPokemonName(splitChosenPokemon);
          } else if (chosenPokemon.toLowerCase().indexOf('primal') !== -1) {
            splitChosenPokemon = chosenPokemon.toLowerCase().split(' ');
            chosenPokemonName = megaPokemonName(splitChosenPokemon);
          } else {
            chosenPokemonName = reverseSplitJoin(chosenPokemon.toLowerCase());
          }
        } else if (chosenPokemon.match(/^[0-9]+$/)) {
          chosenPokemonId = Number(chosenPokemon);
        } else {
          bot.reply(message, 'Sorry, I didn\'t understand... Please say a number OR a name.');
          // add menu ?
        }
        
        // FINDING THE POKEMON ENTRY BASED ON SET POKEDEX
        if (chosenPokemonId || chosenPokemonName) {
          var pokedex;
          if (!userPokedex[message.user]) {
            pokedex = 'https://pokeapi.co/api/v2/pokedex/1/';
          } else {
            pokedex = userPokedex[message.user][0].url;
          }
          
          console.log(pokedex, 'pokedex');
          
          request(pokedex, function (err, result) {
            if (!err) {
              var resultObject = JSON.parse(result.body);
              var pokemon_entries = resultObject.pokemon_entries;
              var foundPokemon = null;
              
              // if it's an ID...
              if (chosenPokemonId) {
                pokemon_entries.forEach(function(index) {
                  var entry_number = index.entry_number;
                  var pokemonName = index.pokemon_species.name;
                  if (entry_number === chosenPokemonId) {
                    foundPokemon = index.pokemon_species.url;
                    displayFoundPokemon(bot, message, foundPokemon, pokemonName, entry_number);
                  }
                });
              } 
              else if (chosenPokemonName) {   // if it's a name
                pokemon_entries.forEach(function(index) {
                  var entry_number = index.entry_number;
                  var pokemonName = index.pokemon_species.name;
                  if (pokemonName.indexOf(chosenPokemonName) !== -1) {
                    foundPokemon = index.pokemon_species.url;
                    displayFoundPokemon(bot, message, foundPokemon, pokemonName, entry_number);
                  }
                });
                
                if (foundPokemon === null && chosenPokemonName.indexOf('mega') !== -1 || chosenPokemonName.indexOf('primal') !== -1) {
                  pokemonList.forEach(function(listedPokemon) {
                    if (listedPokemon.name.indexOf(chosenPokemonName) !== -1) {
                      foundPokemon = listedPokemon.url;
                      var pokemonName = listedPokemon.name;
                      displayFoundPokemon(bot, message, foundPokemon, pokemonName, null);
                    }
                  });
                }
              }
              
              if (foundPokemon === null) {
                bot.startConversation(message, function(err, convo) {
                  if (!err) {
                    var exists = false;
                    pokemonList.forEach(function(pokemon) {
                      if (pokemon.name.indexOf(chosenPokemonName) !== -1) {
                        exists = true;
                      }
                    })
                    console.log(chosenPokemonName)
                    
                    if (exists === true) {
                      convo.say('The Pokémon that you requested exists but cannot be found in your current game version / Pokédex. Try searching in the National Pokédex instead!');
                      convo.say({attachment: mainMenu});
                    } else {
                      console.log('woo')
                      convo.say('Sorry, I couldn\'t find the Pokémon that you requested.');
                      convo.say({attachment: mainMenu});
                    }
                  } else {
                    bot.reply(message, 'error'); // verify
                    return;
                  }
                });
              }
              
              console.log(chosenPokemonId)
              console.log(chosenPokemonName)
              console.log(foundPokemon)
            } else {
              bot.reply(message, 'error'); // verify
              return;
            }
          });
        }
        convo.stop();
      });
    }
  });
}


// DISPLAY POKEMON WITH MENU

function displayFoundPokemon(bot, message, foundPokemon, pokemonName, entry_number) {
  // search requested pokemon using the URL that was passed
  request(foundPokemon, function (err, result) {
    if (!err) {
      var resultObject = JSON.parse(result.body);
      var nationalDexNo = null;
      var currentPokedexEntryNo = '';
      var pokemonChainUrl = null;
      var isSpecial = false;
      var displayName = null;
      
      if (foundPokemon.indexOf('/pokemon/') !== -1) {   // if the pokemon was found in the pokemon list (instead of pokemon species) and has a different url
        nationalDexNo = resultObject.id;
        isSpecial = true;
        console.log(pokemonName, 'pokemonName')
        displayName = capitalizeFirst(splitJoin(megaPokemonName(pokemonName.split('-'))));
        
        var pokemonNameSplit = pokemonName.split('-');
        
        P.getPokemonSpeciesByName(pokemonNameSplit[0])
          .then(function(response) {
            
            pokemonChainUrl = response.evolution_chain.url;
            console.log(pokemonChainUrl, 'pokemonChainUrl')
          })
          .catch(function(error) {
            console.log('There was an ERROR: ', error);
          });
      } else {
        nationalDexNo = resultObject.pokedex_numbers[(resultObject.pokedex_numbers.length -1)].entry_number;
        currentPokedexEntryNo = 'No. ' + entry_number + ', ';
        pokemonChainUrl = resultObject.evolution_chain.url;
        displayName = resultObject.names[0].name;
      }
      
      if (nationalDexNo) {
        request('https://pokeapi.co/api/v2/pokemon/' + nationalDexNo, function(err, result) {  // need to change the no. display according to chosen pokedex
          if (!err) {
            var isBaby = '';
            var displaySpecial = '';
            
            if (resultObject.is_baby === true) {
              isBaby = ' [baby]';
            } 
            else if (isSpecial === true) {
              displaySpecial = ' [\u2606special\u2606]';
            }
            
            var pokemonInfo = JSON.parse(result.body);
            var pokemonTypes = [];
            
            pokemonInfo.types.forEach(function(type) {
              pokemonTypes.push(type.type.name);
            });
            
            var attachment = {
              'type':'template',
              'payload':{
                'template_type':'generic',
                'elements':[
                  {
                    'title': currentPokedexEntryNo + displayName + isBaby + displaySpecial,
                    'image_url': pokemonInfo.sprites.front_default,
                    'subtitle': 'Type(s) : ' + beautifyWordsArrays(pokemonTypes),
                    'buttons': [
                      {
                      'type':'postback',
                      'title':'See evolution chain',
                      'payload':'evolution-button*' + pokemonName + '*' + pokemonChainUrl + '*' + displayName
                      },
                      {
                      'type':'postback',
                      'title':'Search for a Pokémon',
                      'payload':'search'
                      },
                      {
                      'type':'postback',
                      'title':'That\'s all for now',
                      'payload':'thatsall-button'
                      }
                    ]
                  }
                ]
              }
            };
            
            bot.startConversation(message, function(err, convo) {
              if (!err) {
                convo.say('I have found:');
                convo.say({attachment: attachment});
              }
            });
          } else {
            bot.startConversation(message, function(err, convo) {
              if (!err) {
                convo.say('Sorry, I couldn\'t find the Pokémon that you requested.');  // verify  -> server error?
                convo.say({attachment: mainMenu});
              } else {
                bot.reply(message, 'error'); // verify
                return;
              }
            });
          }
        });
      } else {
        bot.startConversation(message, function(err, convo) {
          if (!err) {
            convo.say('Sorry, I couldn\'t find the Pokémon that you requested.');
            convo.say({attachment: mainMenu});
          } else {
            bot.reply(message, 'error'); // verify
            return;
          }
        });
      } 
    }
  });
}


// GET EVOLUTION CHAIN

function getEvolutionChain(bot, message, pokemonName, pokemonChainUrl, displayName) {
  request(pokemonChainUrl, function (err, result) {
    if (!err) {
      var evolutionInfos = JSON.parse(result.body);
      sortEvolutionLevels(bot, message, pokemonName, pokemonChainUrl, displayName, evolutionInfos);
    } else {
      console.log('The was an error: ' + err) // verify
      return;
    }
  });
}


// SORT EVOLUTION LEVELS

function sortEvolutionLevels(bot, message, pokemonName, pokemonChainUrl, displayName, evolutionInfos) {
  var first = evolutionInfos.chain.species.name;
  var evoLevelTwoArray = [];
  var evoLevelThreeArray = [];
  var totalPokemonsInChain = [];
  var counter = 1;
  
  var secondLevel = [];
  var thirdLevel = [];
  
  if (evolutionInfos.chain.evolves_to.length > 0) {           // if at least 2 stages evolution
    evoLevelTwoArray = evolutionInfos.chain.evolves_to;
    
    evoLevelTwoArray.forEach(function(evolution) {            // loop over second-stage pokemon
      console.log(evolution, 'evolution')
      secondLevel.push(evolution.species.name);
      totalPokemonsInChain.push(evolution.species.name);
      counter++;
      
      if (evolution.evolves_to.length > 0) {                  // if there is at least 1 level three stage for this level 2 pokemon
        evolution.evolves_to.forEach(function(evolution2) {   // loop over
          evoLevelThreeArray.push(evolution2);                // push level 3 pokemons
          thirdLevel.push(evolution2.species.name);
          totalPokemonsInChain.push(evolution2.species.name);
          counter++;
        });
      }
    });
    totalPokemonsInChain.push(first);
  } else {
    totalPokemonsInChain.push(first);
  }
  
  console.log(totalPokemonsInChain, 'totalPokemonsInChain')
  console.log(counter, 'counter')
  
  if (totalPokemonsInChain.length === counter) {
    sortMegaPrimal(bot, message, pokemonName, pokemonChainUrl, displayName, evolutionInfos, totalPokemonsInChain, first, secondLevel, thirdLevel, evoLevelTwoArray, evoLevelThreeArray);
  }
}


// SORT MEGA / PRIMAL
  
function sortMegaPrimal(bot, message, pokemonName, pokemonChainUrl, displayName, evolutionInfos, totalPokemonsInChain, first, secondLevel, thirdLevel, evoLevelTwoArray, evoLevelThreeArray) {
  var relatedSpecialPokemons = {};
  var mega = [];
  var primal = [];
  
  totalPokemonsInChain.forEach(function(pokemonInChain) {
    if (pokemonList) {
      pokemonList.forEach(function(pokemonInList) {
        if (pokemonInList.name.indexOf(pokemonInChain) !== -1 && pokemonInList.name !== pokemonInChain) {   // if there are many pokemon with the same name in the full list (Charizard, Mega Charizard X, etc.)
          if (!relatedSpecialPokemons[pokemonInChain]) {
            relatedSpecialPokemons[pokemonInChain] = [];
          }
          relatedSpecialPokemons[pokemonInChain].push(pokemonInList.name);
        }
      });
    } else {
      return;
    }
  });
  console.log(relatedSpecialPokemons, 'relatedSpecialPokemons')
  
  for (var key in relatedSpecialPokemons) {
    var list = relatedSpecialPokemons[key];
    
    list.forEach(function(listedPokemon){
      if (listedPokemon.indexOf('-mega') !== -1) {              // if a mega pokemon is found in the special pokemon versions
        var megaPokemonSplit = listedPokemon.split('-');        // split because 'mega' is displayed after the pokemon name in the API
        
        var megaPokemon = megaPokemonName(megaPokemonSplit);
        
        mega.push(megaPokemon);
      } 
      else if (listedPokemon.indexOf('-primal') !== -1) {
        var primalPokemonSplit = listedPokemon.split('-');
        
        var pokemon = primalPokemonSplit.shift();
        var primalPokemon = primalPokemonSplit + '-' + pokemon;
        
        primal.push(primalPokemon);  
      }
    });
  }
  
  console.log(mega, 'mega')
  console.log(primal, 'primal')
  
  locationFinder(bot, message, pokemonName, pokemonChainUrl, displayName, evolutionInfos, first, secondLevel, thirdLevel, evoLevelTwoArray, evoLevelThreeArray, mega, primal);
}


// FIND AVAILABLE EVOLUTION TRIGGER LOCATIONS 

function locationFinder(bot, message, pokemonName, pokemonChainUrl, displayName, evolutionInfos, first, secondLevel, thirdLevel, evoLevelTwoArray, evoLevelThreeArray, mega, primal) {
  var availableLocationsArray = [];
  
  // pre-sorting pokemon levels and checking if they have a specified location for evolution trigger. 
  // if yes, save the region and displayName in the same location object and push that object into an array that will be passed to further functions
  
  if (evoLevelTwoArray.length > 0) {   // if at least 2 stages evolution
    var count = evoLevelTwoArray.length;
    var count2 = null;
    var locationFound = null;
    var locationCounter = 0;
    console.log(count, 'count beginning')
    
    evoLevelTwoArray.forEach(function(evolution) {  // loop over second-stage pokemon
      var evolutionDetails = evolution.evolution_details;
      
      if (evoLevelThreeArray.length > 0) {  // if 3rd-stage evolution level exists
        var location2Found = null;
        count2 = evoLevelThreeArray.length;
        
        evoLevelThreeArray.forEach(function(evolution) {  // loop over 3rd stage pokemon
          var evolutionDetails2 = evolution.evolution_details;
          count2--;
          
          evolutionDetails2.forEach(function(detail) {  // for each evolution trigger details per pokemon
            var locationInfos2 = detail.location;
            
            if (locationInfos2 !== null) {   // if there is a location
              location2Found = true;
              locationCounter++;
              
              P.getLocationByName(locationInfos2.name)      // get infos about that location with found name
                .then(function(response) {
                  locationInfos2.region = response.region.name;    // save corresponding region in found location object
                  
                  response.names.forEach(function(name) {       // loop over display names available
                    if (name.language.name === 'en') {          // if name is in English
                      locationInfos2.displayName = name.name;   // save corresponding name in found location object
                    }
                  });
                  availableLocationsArray.push(locationInfos2);          // push location object with added region and displayName in an array
                  
                  if (count2 === 0 && location2Found === true && locationCounter === availableLocationsArray.length) {  // if 
                    console.log(availableLocationsArray, 'availableLocationsArray');
                    console.log('possibility 1')
                    botSayEvolution(bot, message, displayName, evolutionInfos, evoLevelTwoArray, evoLevelThreeArray, first, secondLevel, thirdLevel, pokemonName, availableLocationsArray, mega, primal);
                  }
                })
                .catch(function(error) {
                  console.log('There was an ERROR: ', error);
                });
            } else if (count2 === 0 && location2Found === null) {  // 3 evolution levels, without locations
              console.log('possibility 2')
              botSayEvolution(bot, message, displayName, evolutionInfos, evoLevelTwoArray, evoLevelThreeArray, first, secondLevel, thirdLevel, pokemonName, availableLocationsArray, mega, primal);
            }
          });
        });
        
      } else {  // two-stage evolution pokemon 
        count--;
        console.log(count, 'count')
        
        evolutionDetails.forEach(function(detail) {
          var locationInfos = detail.location;
          console.log(locationInfos, ', locationInfos')
          
          if (locationInfos !== null) {
            locationFound = true;
            locationCounter++;
            
            P.getLocationByName(locationInfos.name)
              .then(function(response) {
                console.log(response.region.name, 'response.region.name')
                locationInfos.region = response.region.name;
                
                response.names.forEach(function(name) {
                  if (name.language.name === 'en') {
                    locationInfos.displayName = name.name;
                  }
                });
                console.log(locationInfos, 'locationInfos')
                availableLocationsArray.push(locationInfos);
                
                if (count2 === null && count === 0 && locationFound === true && locationCounter === availableLocationsArray.length) {
                  console.log(availableLocationsArray, 'availableLocationsArray');
                  console.log('possibility 3')
                  botSayEvolution(bot, message, displayName, evolutionInfos, evoLevelTwoArray, evoLevelThreeArray, first, secondLevel, thirdLevel, pokemonName, availableLocationsArray, mega, primal);
                }
              })
              .catch(function(error) {
                console.log('There was an ERROR: ', error);
              });
          } else if (count === 0 && locationFound === null && evolution.evolves_to.length === 0) {  // 2 evolution levels, without locations
            console.log('possibility 4')
            botSayEvolution(bot, message, displayName, evolutionInfos, evoLevelTwoArray, evoLevelThreeArray, first, secondLevel, thirdLevel, pokemonName, availableLocationsArray, mega, primal);
          }
        });
      }
    });
    console.log(locationCounter, 'locationCounter')
    
  } else {  // one level only pokemon
    console.log('possibility 5')
    botSayEvolution(bot, message, displayName, evolutionInfos, evoLevelTwoArray, evoLevelThreeArray, first, secondLevel, thirdLevel, pokemonName, availableLocationsArray, mega, primal);
  }
}


// BOT SAY EVOLUTION

function botSayEvolution(bot, message, displayName, evolutionInfos, evoLevelTwoArray, evoLevelThreeArray, first, secondLevel, thirdLevel, pokemonName, availableLocationsArray, mega, primal) {  
  bot.startConversation(message, function(err, convo) {
    if (!err) {
      var megaDisplay = '';
      var megaChain = '';
      var primalChain = '';
      var primalDisplay = '';
      
      if (mega.length > 0) {
        megaDisplay =  ' However, it can mega evolve to' + displayMegaEvol(beautifyWordsArrays(mega)) + ' in battle.';
        megaChain = '\n\u2771\u2771 ' + displayMegaEvol(beautifyWordsArrays(mega));
      } else if (primal.length > 0) {
        primalDisplay =  ' However, it can revert to' + displayMegaEvol(beautifyWordsArrays(primal)) + ' in battle.';
        primalChain = '\n\u2771\u2771 ' + beautifyWordsArrays(primal);
      }
      
      var current = pokemonName;
      
      // sending the right information depending on the evolution chain
      if (first === current && secondLevel.length > 0) {    // if the current pokemon is the first in the chain and there is a second level
        thirdLevel.length === 0 ? convo.say(displayName + ' \u21e8' + beautifyWordsArrays(secondLevel) + megaChain + primalChain) : convo.say(displayName + ' \u21e8' + beautifyWordsArrays(secondLevel) + ' \u21e8' + beautifyWordsArrays(thirdLevel) + megaChain + primalChain);
        
        evoLevelTwoArray.forEach(function(pokemon) {
          var evolved = capitalizeFirst(splitJoin(pokemon.species.name));
          var details = pokemon.evolution_details;
          
          sayEvolutionTriggers(bot, message, convo, details, current, evolved, evolutionInfos, displayName, availableLocationsArray);
        });
        convo.say({attachment: newSearchMenu});
      } 
      
      else if (first === current && secondLevel.length === 0) {  // if the current pokemon is the first in the chain and there is no second level
        if (mega.length > 0 || primal.length > 0) {
          convo.say(displayName + megaChain + primalChain);
        }
        convo.say(displayName + ' doesn\'t have any known evolution.' + megaDisplay + primalDisplay);
        convo.say({attachment: newSearchMenu});
      } 
      
      else if (secondLevel.indexOf(current) !== -1 && thirdLevel.length > 0) {  // if the current pokemon is the second in the chain and there is a third level
        convo.say(capitalizeFirst(splitJoin(first)) + ' \u21e8' + beautifyWordsArrays(secondLevel) + ' \u21e8' + beautifyWordsArrays(thirdLevel) + megaChain + primalChain);
        
        evoLevelThreeArray.forEach(function(pokemon) {
          var evolved = capitalizeFirst(splitJoin(pokemon.species.name));
          var details = pokemon.evolution_details;
          sayEvolutionTriggers(bot, message, convo, details, current, evolved, evolutionInfos, displayName, availableLocationsArray);
        });
        convo.say({attachment: newSearchMenu});
      } 
      
      else if (secondLevel.indexOf(current) !== -1 && thirdLevel.length === 0) {  // if the current pokemon is the second in the chain and there is no third level
        convo.say(capitalizeFirst(splitJoin(first)) + ' \u21e8' + beautifyWordsArrays(secondLevel) + megaChain + primalChain);
        convo.say(displayName + ' is at its final evolution stage.' + megaDisplay + primalDisplay);
        convo.say({attachment: newSearchMenu});
      } 
      
      else if (thirdLevel.indexOf(current) !== -1) {
        convo.say(capitalizeFirst(splitJoin(first)) + ' \u21e8' + beautifyWordsArrays(secondLevel) + ' \u21e8' + beautifyWordsArrays(thirdLevel) + megaChain + primalChain);
        convo.say(displayName + ' is at its final evolution stage.' + megaDisplay + primalDisplay);
        convo.say({attachment: newSearchMenu});
      }
      // if searched pokemon is a mega evolution
      else if (current.indexOf('mega') !== -1) {
        var pokemon = current.split('-');
        var megaEvolvedFrom = null;
        
        mega.forEach(function(megaPok) { 
          if (megaPok.indexOf(pokemon[0]) !== -1) {
            if (thirdLevel.indexOf(pokemon[0]) !== -1) {
              megaEvolvedFrom = capitalizeFirst(pokemon[0]);
            } else if (secondLevel.indexOf(pokemon[0]) !== -1) {
              megaEvolvedFrom = capitalizeFirst(pokemon[0]);
            } else if (first.indexOf(pokemon[0]) !== -1) {
              megaEvolvedFrom = capitalizeFirst(pokemon[0]);
            }
          }
        });
        
        if (secondLevel.length > 0 && thirdLevel.length === 0) {
          convo.say(capitalizeFirst(splitJoin(first)) + ' \u21e8' + beautifyWordsArrays(secondLevel) + megaChain + primalChain); 
        } else if (secondLevel.length > 0 && thirdLevel.length > 0) {
          convo.say(capitalizeFirst(splitJoin(first)) + ' \u21e8' + beautifyWordsArrays(secondLevel) + ' \u21e8' + beautifyWordsArrays(thirdLevel) + megaChain + primalChain);
        } else {
          convo.say(capitalizeFirst(splitJoin(first)) + megaChain + primalChain);
        }
        
        convo.say(displayName + ' is the mega evolution of ' + megaEvolvedFrom);
        convo.say({attachment: newSearchMenu});
      }
      // if searched pokemon is a primal reversion
      else if (current.indexOf('primal') !== -1) {
        pokemon = current.split('-');
        var primalRevFrom = null;
        
        primal.forEach(function(primalPok) { 
          if (primalPok.indexOf(pokemon[0]) !== -1) {
            if (thirdLevel.indexOf(pokemon[0]) !== -1) {
              primalRevFrom = capitalizeFirst(pokemon[0]);
            } else if (secondLevel.indexOf(pokemon[0]) !== -1) {
              primalRevFrom = capitalizeFirst(pokemon[0]);
            } else if (first.indexOf(pokemon[0]) !== -1) {
              primalRevFrom = capitalizeFirst(pokemon[0]);
            }
          }
        });
        
        if (secondLevel.length > 0 && thirdLevel.length === 0) {
          convo.say(capitalizeFirst(splitJoin(first)) + ' \u21e8' + beautifyWordsArrays(secondLevel) + megaChain + primalChain); 
        } else if (secondLevel.length > 0 && thirdLevel.length > 0) {
          convo.say(capitalizeFirst(splitJoin(first)) + ' \u21e8' + beautifyWordsArrays(secondLevel) + ' \u21e8' + beautifyWordsArrays(thirdLevel) + megaChain + primalChain);
        } else {
          convo.say(capitalizeFirst(splitJoin(first)) + megaChain + primalChain);
        }
        
        convo.say(displayName + ' is the primal reversion of ' + primalRevFrom);
        convo.say({attachment: newSearchMenu});
      }
      
      else {
        bot.reply(message, 'there was an error: ' + err);
        return;
      }
      
    } else {
      console.log('butts')
      bot.reply(message, 'there was an error: ' + err);
      return;
    }
  });
}


// EVOLUTION TRIGGERS

function trigger(triggerType, detail) {
  if (triggerType === 'level-up') {
    return ' by leveling up'; 
  } else if (triggerType === 'trade') {
    return ' after being traded with another player';
  } else if (triggerType === 'use-item') {
    return ' by being exposed to: ' + capitalizeFirst(splitJoin(detail.item.name));
  } else if (triggerType === 'shed') {
    return ' by shedding (?)'; // ? change this  
  }
}


// EVOLUTION CONDITIONS

function sayEvolutionTriggers(bot, message, convo, details, current, evolved, evolutionInfos, displayName, availableLocationsArray) {

  details.forEach(function(detail) {
    if (detail.visited) {
      return;
    }
    
    var conditions = ':';
    
    if (detail.min_level) {
      conditions += '\n• starting at level ' + detail.min_level;
    }
    if (detail.min_beauty) {
      conditions += '\n• with a beauty level of at least ' + detail.min_beauty + ' points';
    }
    if (detail.time_of_day.length > 1) {
      conditions += '\n• during the ' + detail.time_of_day;
    }
    if (detail.gender) {
      var gender;
      if (detail.gender === 1) {
        gender = 'female';
      } else if (detail.gender === 2) {
        gender = 'male';
      } else if (detail.gender === 3) {
        gender = 'genderless';
      }
      conditions += '\n• your ' + displayName + ' must be: ' + gender;
    }
    if (detail.relative_physical_stats || detail.relative_physical_stats === 0) {
      var relativeStats;
      if (detail.relative_physical_stats === 1) {
        relativeStats = 'its Attack is higher than its Defense';
      } else if (detail.relative_physical_stats === 0) {
        relativeStats = 'its Attack and Defense are the same';
      } else if (detail.relative_physical_stats === -1) {
        relativeStats = 'its Defense is higher than its Attack';
      }
      conditions += '\n• if ' + relativeStats;
    }
    if (detail.needs_overworld_rain) {
      conditions += '\n• while it\'s raining in the overworld';
    }
    if (detail.turn_upside_down) {
      conditions += '\n• you must hold your 3DS upside-down when leveling up';  // Inkay
    }
    // if (detail.item) {
    //   conditions += '\n• using this item: ' + splitJoin(detail.item.name);  // might not be needed if only comes up with item evolution trigger
    // }
    if (detail.known_move_type) {
      conditions += '\n• while knowing a ' + capitalizeFirst(detail.known_move_type.name) + '-type move';
    }
    if (detail.min_affection) {
      conditions += '\n• while having at least ' + detail.min_affection + ' affection hearts in Pokémon-Amie';
    }
    if (detail.party_type) {
      conditions += '\n• while having a ' + capitalizeFirst(detail.party_type) + '-type Pokémon in your party';
    }
    if (detail.trade_species) {
      conditions += '\n• you must trade it for a ' + capitalizeFirst(detail.trade_species);
    }
    if (detail.party_species) {
      conditions += '\n• while having a ' + capitalizeFirst(detail.party_species.name) + ' in your party';
    }
    if (detail.min_happiness) {
      conditions += '\n• with a happiness level of at least ' + detail.min_happiness + ' points';
    }
    if (detail.held_item) {
      conditions += '\n• while holding: ' + capitalizeFirst(splitJoin(detail.held_item.name));
    }
    if (detail.known_move) {
      conditions += '\n• while knowing the move: ' + capitalizeFirst(splitJoin(detail.known_move.name)); 
    }
    if (detail.location) {
      var locationsArray = [];
      var currentRegion = null;
      
      if (userPokedex[message.user]) {
        var currentRegionSplit = userPokedex[message.user][0].name.split('-');
        
        if (currentRegionSplit[0] === 'updated') {
          currentRegion = currentRegionSplit[1];
        } else if (currentRegionSplit[0] === 'original') {
          currentRegion = currentRegionSplit[1];
        } else if (currentRegionSplit[0] === 'extended') {
          currentRegion = currentRegionSplit[1];
        } else if (currentRegionSplit[0] === 'kalos') {
          currentRegion = currentRegionSplit[0];
        } else if (currentRegionSplit.length === 1) {
          currentRegion = currentRegionSplit[0];
        }
      }
      
      details.forEach(function(detail2) {
        if (detail2.min_level === detail.min_level 
          && detail2.min_beauty === detail.min_beauty
          && detail2.time_of_day === detail.time_of_day
          && detail2.gender === detail.gender
          && detail2.relative_physical_stats === detail.relative_physical_stats
          && detail2.needs_overworld_rain === detail.needs_overworld_rain
          && detail2.turn_upside_down === detail.turn_upside_down
          && detail2.item === detail.item
          && detail2.known_move_type === detail.known_move_type
          && detail2.min_affection === detail.min_affection
          && detail2.party_type === detail.party_type
          && detail2.trade_species === detail.trade_species
          && detail2.party_species === detail.party_species
          && detail2.min_happiness === detail.min_happiness
          && detail2.held_item === detail.held_item
          && detail2.known_move === detail.known_move
          && detail2 !== detail) {
          detail2.visited = true;
          
          if (currentRegion !== null) {
            availableLocationsArray.forEach(function(location) {
              if (location.name === detail2.location.name && location.region === currentRegion) {
                locationsArray.push(location.displayName);
              }
            });
          } else {
            availableLocationsArray.forEach(function(location) {
              if (location.name === detail2.location.name) {
                locationsArray.push(' ' + location.displayName + ' (' + capitalizeFirst(location.region) + ')');
              }
            });
          }
        }
      });
      
      if (currentRegion !== null) {
        availableLocationsArray.forEach(function(location) {
          if (location.name === detail.location.name && location.region === currentRegion) {
            locationsArray.push(location.displayName);
          }
        });
      } else {
        availableLocationsArray.forEach(function(location) {
          if (location.name === detail.location.name) {
            locationsArray.push(' ' + location.displayName + ' (' + capitalizeFirst(location.region) + ')');
          }
        });
      }
      
      if (locationsArray.length > 1) {
        conditions += '\n• while being located in either:' + locationsArray;
      } else if (locationsArray.length === 1) {
        conditions += '\n• while being located in: ' + locationsArray;
      } else {
        conditions += '\n• Sorry, it seems the location condition cannot be met in your current game version. This evolution is probably available in more recent games only.';
      }
    }
    
    if (conditions.length === 1) {
      conditions = '.';
    }
    
    convo.say(displayName + ' evolves to ' + evolved + trigger(detail.trigger.name, detail) + conditions);
  });
  
  // find a nice separator (for multiple evolutions like Eevee).... stars ? '\u2606'
}


// GET TYPES INFO

controller.hears('^type$', 'message_received', getType);

function getType(bot, message) {
  bot.startConversation(message, function(err, convo) {
    if (!err) {
      convo.ask('What type do you need information for?', function(response, convo) {
        bot.reply(message, 'Okay, one second!');
        var chosenType = response.text.toLowerCase();
        
        request('https://pokeapi.co/api/v2/type/', function (err, result) {
          if (!err) {
            var resultObject = JSON.parse(result.body);
            var typesArray = resultObject.results;
            var foundType = null;
            
            typesArray.forEach(function(type) {
              if (type.name === chosenType) {
                foundType = type.url;
              }
            });
            
            if (foundType !== null) {
              request(foundType, function(err, result) {
                if (!err) {
                  var resultObject = JSON.parse(result.body);
                  var damageRelations = resultObject.damage_relations;
                  
                  var halfDamageFrom = [];
                  var noDamageFrom = [];
                  var halfDamageTo = [];
                  var doubleDamageFrom = [];
                  var noDamageTo = [];
                  var doubleDamageTo = [];
                  
                  if (damageRelations.half_damage_from.length > 0) {
                    damageRelations.half_damage_from.forEach(function(type) {
                      halfDamageFrom.push(type.name);
                    });
                  }
                  if (damageRelations.no_damage_from.length > 0) {
                    damageRelations.no_damage_from.forEach(function(type) {
                      noDamageFrom.push(type.name);
                    });
                  }
                  if (damageRelations.half_damage_to.length > 0) {
                    damageRelations.half_damage_to.forEach(function(type) {
                      halfDamageTo.push(type.name);
                    });
                  }
                  if (damageRelations.double_damage_from.length > 0) {
                    damageRelations.double_damage_from.forEach(function(type) {
                      doubleDamageFrom.push(type.name);
                    });
                  }
                  if (damageRelations.no_damage_to.length > 0) {
                    damageRelations.no_damage_to.forEach(function(type) {
                      noDamageTo.push(type.name);
                    });
                  }
                  if (damageRelations.double_damage_to.length > 0) {
                    damageRelations.double_damage_to.forEach(function(type) {
                      doubleDamageTo.push(type.name);
                    });
                  }
                  
                  console.log(halfDamageFrom, 'halfDamageFrom') 
                  console.log(noDamageFrom, 'noDamageFrom')
                  console.log(halfDamageTo, 'halfDamageTo')
                  console.log(doubleDamageFrom, 'doubleDamageFrom')
                  console.log(noDamageTo, 'noDamageTo')
                  console.log(doubleDamageTo, 'doubleDamageTo')
                  
                  displayTypeInfos(message, bot, chosenType, halfDamageFrom, noDamageFrom, doubleDamageFrom, halfDamageTo, noDamageTo, doubleDamageTo);
                  
                } else {
                  bot.reply(message, 'error'); // verify
                  return;
                }
              });
            } else {
              bot.startConversation(message, function(err, convo) {
                if (!err) {
                  convo.say('Sorry, I couldn\'t find the type that you requested.');  // verify
                  convo.say({attachment: mainMenu});
                } else {
                  bot.reply(message, 'error'); // verify
                  return;
                }
              });
            }
          } else {
            bot.reply(message, 'error'); // verify
            return;
          }
        });
        convo.stop();
      });
    } else {
      bot.reply(message, 'error'); // verify
    }
  });
}


// DISPLAY TYPES INFOS

function displayTypeInfos(message, bot, chosenType, halfDamageFrom, noDamageFrom, doubleDamageFrom, halfDamageTo, noDamageTo, doubleDamageTo) {
  var typeInfosGood = '';
  var typeInfosBad = '';
  
  if (doubleDamageTo.length > 0) {
    typeInfosGood += '\n• does double damage to' + beautifyWordsArrays(doubleDamageTo) + ' type(s)';
  }
  if (noDamageFrom.length > 0) {
    typeInfosGood += '\n• takes no damage from' + beautifyWordsArrays(noDamageFrom) + ' type(s)';
  }
  if (halfDamageFrom.length > 0) {
    typeInfosGood += '\n• takes half damage from' + beautifyWordsArrays(halfDamageFrom) + ' type(s)';
  }
  if (noDamageTo.length > 0) {
    typeInfosBad += '\n• doesn\'t do any damage to' + beautifyWordsArrays(noDamageTo) + ' type(s)';
  }
  if (doubleDamageFrom.length > 0) {
    typeInfosBad += '\n• takes double damage from' + beautifyWordsArrays(doubleDamageFrom) + ' type(s)';
  }
  if (halfDamageTo.length > 0) {
    typeInfosBad += '\n• does half damage to' + beautifyWordsArrays(halfDamageTo) + ' type(s)';
  }
  
  bot.startConversation(message, function(err, convo) {
    if (!err) {
      convo.say(':) ' + capitalizeFirst(chosenType) + '-type :)\n' + typeInfosGood);
      convo.say(':( ' + capitalizeFirst(chosenType) + '-type :(\n' + typeInfosBad);
      convo.say({attachment: mainMenu});
    } else {
      bot.reply(message, 'error');  // verify
      return;
    }
  });
}


// TEXT DISPLAY FUNCTIONS

function megaPokemonName(pokemonNameArray) {
  if (pokemonNameArray.length > 2) {                  // if the name is more than 3 words (ex: charizard-mega-x)
    var last = '-' + pokemonNameArray.pop();          // pop the 3rd word
  } else {
    last = '';
  }
  var pokemon = pokemonNameArray.shift();             // shift the pokemon name
  console.log(pokemonNameArray, 'pokemonNameArray')
  console.log(pokemon, 'pokemon')
  return pokemonNameArray + '-' + pokemon + last;     // reassemble
}
  

function displayGameName(game) {
  var array = game.split(' ');
  if (array.length === 4) {
    var first = array[0]+' '+array[1];
    var second = array[2]+' '+array[3];
    return capitalizeFirst(first + ' / ' + second);
  } else {
    return capitalizeFirst(array.join(' / '));
  }
}

function displayMegaEvol(megaEvolution) {
  return megaEvolution.join(' /');
}

function beautifyWordsArrays(array) {
  var newArray = array.map(function(item) {
    var words = [];
    
    if (item.indexOf('-') !== -1) {
      words = item.split('-');
    } else {
      words.push(item);
    }
    
    var capitalizedWords = words.map(function(word) { 
      return ' ' + capitalizeFirst(word);
    });
    
    var joinCapitalizedWords = capitalizedWords.join('');
    return joinCapitalizedWords;
  });
  return newArray;
}

function capitalizeFirst(pokemonName) {
  return pokemonName.replace(/\b./g, function(m){ return m.toUpperCase(); });
}

function splitJoin(sentence) {
  return sentence.split('-').join(' ');
}

function reverseSplitJoin(sentence) {
  return sentence.split(' ').join('-');
}

// TO DO LIST:
/* 
  - if pokemon exists but not in current game, remove pokemon from evolution chain? 
  - controller.hears for everything else that is not a command and bring up the main menu?
  - postback problems on mobile ? 
  - cancel middleware function?
  - test with multiple user
  - test more pokemon evolutions (triggers / conditions)
  - encounter locations ? - not sure if possible
  - evolution items location ? - not sure if possible
  - mega-evolution items names / location ? - not sure if possible
  - special pokemon ?
*/
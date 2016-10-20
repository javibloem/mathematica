#!/bin/bash
INSTALL_COMMANDS=""
LINUX_VERSION="xenial"
command_exists () {
    hash "$1" 2>/dev/null ;
}
add_command(){
	INSTALL_COMMANDS="$INSTALL_COMMANDS $1"
}

hasCurl(){
    if ! command_exists curl  ; then
    	echo "Curl no esta instalado, procendiendo a instalar"
        sudo apt-get install curl;
    fi
}

hasNode(){
    if ! command_exists nodejs  ; then
    	echo "Node no esta instalado, procendiendo a instalar"
    	curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -;
        sudo apt-get install -y nodejs;
    fi
}

hasGit(){
    if ! command_exists git  ; then
    	echo "Git no esta instalado, procendiendo a instalar"
    	curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -;
        sudo apt-get install -y nodejs;
    
    fi
}
hasMongoDB(){
    if ! command_exists mongo  ; then
    	echo "Mongodb no esta instalado, procendiendo a instalar"
    	sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927;
        echo "deb http://repo.mongodb.org/apt/ubuntu $LINUX_VERSION/mongodb-org/3.2 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.2.list;
    	sudo apt-get update ; sudo apt-get install mongodb ;
    	sudo mkdir -p /data/db
  		sudo chown -R `whoami` /data
    fi
}

installAll(){
	hasCurl
	hasGit
	hasNode
	hasMongoDB
	npm install
	git clone https://github.com/SWI-Prolog/pengines.git
}

installAll
echo "Use el archivo llamado run.sh para correr el servidor! :D"
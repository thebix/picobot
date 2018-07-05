#!/bin/bash

# INFO: configure this file
. ./deploy.config

function preCopyActions {
    echo "preCopyActions"
}

function postCopyActions {
    echo "postCopyActions"
}
# END CONFIGURATION

NOW="$(date +'%B %d, %Y %T')"
RED="\033[1;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[1;34m"
PURPLE="\033[1;35m"
CYAN="\033[1;36m"
WHITE="\033[1;37m"
RESET="\033[0m"

function quit {
    echo -e "${YELLOW}Quit. Reason: ${WHITE}$1"
    # reset color
    echo -e "${RESET}"
    exit
}

# $1 type, $2 path
function stringIsEmptyTerminate {
    if stringIsEmpty $2; then
        echo -e "${RED}'$1' directory path is empty"
        quit "Required directory path: '${1}' is empty"
    fi
}

# $1 path
function stringIsEmpty {
    if [ -z "${1// }" ]; then
        true
    else
        false
    fi
}

# $1 type, $2 path, if non exists - terminate
function dirExistsTerminate {
    stringIsEmptyTerminate $1 $2
    if ! dirExists $1 $2; then
        quit "Required directory doesn't exits: ${2}"
    fi
}

# $1 type, $2 path, if non exists - terminate
function dirExists {
    if stringIsEmpty $2; then
        echo -e "${YELLOW}'$1' directory path is empty${RESET}"
        false
    else
        if [ -d $2 ]; then
            echo -e "${GREEN}'$1' directory '${2}' exists${RESET}"
            true
        else
            echo -e "${YELLOW}'$1' directory '${2}' doesn't exitsts${RESET}"
            false
        fi
    fi
}

# $1 type, $2 path
function dirIsEmptyTerminate {
    if ! dirIsEmpty $2; then
        echo -e "${GREEN}'$1' directory is not empty${RESET}"
        false
    else
        echo -e "${RED}'$1' directory is empty${RESET}"
        quit "Required directory: ${2}"
    fi
}

# $1 path
function dirIsEmpty {
    if [ "$(ls -A $1)" ]; then
        false
    else
        true
    fi
}

# No - default
OPTIONS_CONFIRM="No Yes"
function dialogConfirm {
    echo -e $1
    RESPONSE=false
    select opt in $OPTIONS_CONFIRM; do
        if [ "$opt" = "Yes" ]; then
            RESPONSE=true
        fi
        break
    done
    echo -e "Response: ${RESPONSE}${RESET}"
    $RESPONSE
}

# AUTO CONFIGURATION
if [ "$1" != "release" ]; then
    if ! stringIsEmpty "$1"; then
        echo -e "How to:\n${CYAN}./deploy.sh${RESET} -- just copy files\n${CYAN}./deploy.sh release 0.1.0${RESET} -- start release: co release-branch, copy files to rc folder\n ...check release version, hotfix bugs, ci to release branch\n${CYAN}./deploy.sh release 0.1.0 continue${RESET} -- end release: push to git, merge to master/develop ${RESET}"
        quit 666
    fi
fi

IS_RELEASE=false
IS_RELEASE_CONTINUE=false
VERSION="0.0.1"
if [ "$1" == "release" ]; then
    IS_RELEASE=true
    echo $2
    if stringIsEmpty $2; then
        CURRENT_VERSION=`cat VERSION`
        echo -e "${RED}Version of release required. Current ${CURRENT_VERSION}${RESET}"
        quit "No release version"
    else
        VERSION=$2
        if [ "$3" == "continue" ]; then
            IS_RELEASE_CONTINUE=true
        fi
    fi
fi

DIR_IGNORE="$DIR_DESTINATION/$DIR_NAME_DESTINATION_IGNORE"

EXCLUDE_DIRECTORIES_RSYNC=""
for i in "${DIR_EXCLUDE[@]}"
do
    EXCLUDE_DIRECTORIES_RSYNC="$EXCLUDE_DIRECTORIES_RSYNC --exclude='$i'"
done
# END AUTOCONFIGURATION

# greetings
echo -e "${YELLOW}Hello, ${WHITE}man.${RESET}"
if $IS_RELEASE_CONTINUE; then
    echo -e "We are going to CONTINUE deploy ${WHITE}RELEASE ${VERSION}${RESET}"
    git checkout master
    git merge --no-ff "release-${VERSION}"
    git push
    git checkout develop
    git merge --no-ff "release-${VERSION}"
    git push
    git branch -d "release-${VERSION}"
    quit "Release done"
fi
if $IS_RELEASE; then
    echo -e "We are going to deploy ${WHITE}RELEASE ${VERSION}${RESET}"
else
    echo -e "We are going to deploy ${WHITE}DEVELOP${RESET}"
fi

# check directories exits and has content
echo -e "Check configs..."
dirExistsTerminate "Source" $DIR_SOURCE
dirIsEmptyTerminate "Source" $DIR_SOURCE
if ! dirExists "Backup" $DIR_BACKUP; then
    \mkdir $DIR_BACKUP
fi

DIR_IGNORE_EXISTS=false
if ! stringIsEmpty $DIR_NAME_DESTINATION_IGNORE; then
    if dirExists "Ignore" $DIR_IGNORE; then
        if ! dirIsEmpty $DIR_IGNORE; then
            DIR_IGNORE_EXISTS=true
        fi
    fi
fi
if ! stringIsEmpty $DIR_EXCLUDE; then
    echo "Directories to exclude (no copy/bkp) ${WHITE}$DIR_EXCLUDE${RESET}"
fi

if ! dirExists "Logs" "./logs"; then
    \mkdir "./logs"
fi

# apply pre copy actions from config
echo -e "Apply ${WHITE}pre copy${RESET} actions..."
preCopyActions
echo -e "Pre copy actions applied"

# clean previous backups with prompt
if dialogConfirm "${CYAN}Remove old archives?"; then
    \rm -rf $DIR_BACKUP
    mkdir $DIR_BACKUP
fi
# backup destination directory
echo -e "Backup to '${WHITE}${DIR_BACKUP}/${PWD##*/}-${NOW}${RESET}'"
yes | eval rsync -av $DIR_DESTINATION/ "'$DIR_BACKUP/${PWD##*/}-${NOW}/'"  ${EXCLUDE_DIRECTORIES_RSYNC}
# copy source to destination without ignore directory
echo -e "Copy source '${WHITE}${DIR_SOURCE}${RESET}' to destination '${WHITE}${DIR_DESTINATION}${RESET}'"
yes | eval rsync -av --delete "'$DIR_SOURCE/'" "'$DIR_DESTINATION/'"  ${EXCLUDE_DIRECTORIES_RSYNC} "--exclude='$DIR_NAME_DESTINATION_IGNORE/*'"

# apply post copy actions from config
echo -e "Apply ${WHITE}post copy${RESET} actions..."
postCopyActions
echo -e "Post copy actions applied"

if $IS_RELEASE; then
    echo -e "Creating a release branch"
    git checkout develop
    git checkout -b "release-${VERSION}" develop
    echo -e "${CYAN}Change ${WHITE}./package.json${CYAN}. Then press enter to continue.${RESET}"
    read
    npm run build
    git add .
    ./bump-version.sh
    echo -e "Push release branch to remote"
    git push --set-upstream origin "release-${VERSION}"
    git status
fi

# exit success
quit 666

# INFO: check param exists/nonexists
# if [ -z "$1" ]; then
#     echo usage: $0 directory
#     exit
# else
#     echo -e $0 directory
# fi

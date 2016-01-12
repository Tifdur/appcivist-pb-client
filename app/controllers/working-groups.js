/**
 * Created by cdparra on 12/8/15.
 */


appCivistApp.controller('NewWorkingGroupCtrl', function($scope, $http, $routeParams, localStorageService,
                                                        Assemblies, Campaigns, WorkingGroups, Contributions,
                                                        FileUploader, $translate, $location) {

    init();
    initializeAssembly();
    initializeCampaign();

    function init() {
        $scope.errors = [];
        $scope.assemblyID = $routeParams.aid;
        $scope.campaignID = $routeParams.cid;
        $scope.workingGroupID = $routeParams.wid;
        $scope.newWorkingGroup = WorkingGroups.defaultNewWorkingGroup();
        $scope.defaultIcons = [
            {"name": "Justice Icon", "url":"https://s3-us-west-1.amazonaws.com/appcivist-files/icons/justicia-140.png"},
            {"name": "Plan Icon", "url":"https://s3-us-west-1.amazonaws.com/appcivist-files/icons/tabacalera-140.png"},
            {"name": "Article 49 Icon", "url":"https://s3-us-west-1.amazonaws.com/appcivist-files/icons/article19-140.png"},
            {"name": "Passe Livre Icon", "url":"https://s3-us-west-1.amazonaws.com/appcivist-files/icons/image74.png"},
            {"name": "Skyline Icon", "url":"https://s3-us-west-1.amazonaws.com/appcivist-files/icons/image75.jpg"}
        ];

        $scope.$watch("newWorkingGroup.name",function(newVal, oldval){
            $translate('wgroup.invitation.email.text', { group: $scope.newWorkingGroup.name }).then(function (text) {
                $scope.newWorkingGroup.invitationEmail = text;
            });
        },true);

        $scope.setNewWorkingGroupIcon = function(url, name) {
            $scope.newWorkingGroup.profile.icon = url;
            var file = {};
            file.name = name;
            file.url = url;
            $scope.f = file;
        }

        $scope.uploadFiles = function(file, errFiles) {
            $scope.f = file;
            $scope.errFile = errFiles && errFiles[0];
            $scope.iconResource = {};
            FileUploader.uploadFileAndAddToResource(file, $scope.iconResource);
        };

        $scope.addEmailsToList = function(emailsText) {
            $scope.invalidEmails = [];
            var emails = emailsText.split(',');
            emails.forEach(function(email){
                console.log("Adding email: " + email);
                var invitee = {};
                invitee.email = email.trim();
                if($scope.isValidEmail(invitee.email)) {
                    invitee.moderator = false;
                    invitee.coordinator = false;
                    $scope.newWorkingGroup.invitations.push(invitee);
                } else {
                    $scope.invalidEmails.push(invitee.email);
                }
            });
            $scope.inviteesEmails = "";
        }

        $scope.isValidEmail = function(email) {
            var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
            return re.test(email);
        }

        $scope.removeInvalidEmail = function(index) {
            $scope.invalidEmails.splice(index, 1);
        };

        $scope.removeInvitee = function(index) {
            $scope.newWorkingGroup.invitations.splice(index,1);
        }

        $scope.createWorkingGroup = function() {
            // 1. process themes
            for (var i = 0; i < $scope.campaignThemes.length; i++) {
                if ($scope.campaignThemes[i].selected) {
                    $scope.newWorkingGroup.existingThemes.push($scope.campaignThemes[i]);
                }
            }

            // 2. process membership

            if($scope.newWorkingGroup.profile.membership === 'OPEN') {
                $scope.newWorkingGroup.profile.supportedMembership="OPEN";
            } else if ($scope.newWorkingGroup.profile.membership === 'REGISTRATION') {
                if($scope.newWorkingGroup.profile.registration.invitation &&
                    ! $scope.newWorkingGroup.profile.registration.request) {
                    $scope.newWorkingGroup.profile.supportedMembership = "INVITATION";
                } else if(! $scope.newWorkingGroup.profile.registration.invitation &&
                    $scope.newWorkingGroup.profile.registration.request) {
                    $scope.newWorkingGroup.profile.supportedMembership = "REQUEST";
                } else if($scope.newWorkingGroup.profile.registration.invitation &&
                    $scope.newWorkingGroup.profile.registration.request) {
                    $scope.newWorkingGroup.profile.supportedMembership = "INVITATION_AND_REQUEST";
                }
            }
            // 3. process management

            console.log("Creating assembly with membership = "+$scope.newWorkingGroup.profile.supportedMembership);
            if($scope.newWorkingGroup.profile.moderators === 'none' && $scope.newWorkingGroup.profile.coordinators === 'none' ) {
                $scope.newWorkingGroup.profile.managementType="OPEN";
            } else if ($scope.newWorkingGroup.profile.moderators === 'two' || $scope.newWorkingGroup.profile.moderators === 'all') {
                if($scope.newWorkingGroup.profile.coordinators === 'two' || $scope.newWorkingGroup.profile.coordinators === 'all') {
                    $scope.newWorkingGroup.profile.managementType = "COORDINATED_AND_MODERATED";
                } else if(! $scope.newWorkingGroup.profile.role.coordinators &&
                    $scope.newWorkingGroup.profile.role.moderators ) {
                    $scope.newWorkingGroup.profile.managementType = "MODERATED";
                }
            } else {
                $scope.newWorkingGroup.profile.managementType = "COORDINATED";
            }

            var newGroup = WorkingGroups.workingGroup($scope.assemblyID).save($scope.newWorkingGroup);
            newGroup.$promise.then(
                function (response) {
                    $scope.newWorkingGroup = response;
                    $location.url("/assembly/"+$scope.assemblyID+"/group/"+$scope.newWorkingGroup.groupId);
                },
                function (error) {
                    $scope.errors.push(error);
                }
            );
        }
    }

    function initializeAssembly () {
        $scope.assembly = Assemblies.assembly($scope.assemblyID).get();
        $scope.assembly.$promise.then(
            function (response) {
                $scope.assembly = response;
            },
            function (error) {
                $scope.errors.push(error);
            }
        );
    }

    function initializeCampaign () {
        $scope.campaign = Campaigns.campaign($scope.assemblyID, $scope.campaignID).get();
        $scope.campaign.$promise.then(
            function (response) {
                $scope.campaign = response;
                $scope.campaignThemes = $scope.campaign.themes;
            },
            function (error) {
                $scope.errors.push(error);
            }
        );
    }
});

appCivistApp.controller('WorkingGroupCtrl', function($scope, $http, $routeParams, usSpinnerService, $uibModal,
                                                     localStorageService, Contributions, WorkingGroups, Assemblies) {
    init();
    function init() {
        $scope.assemblyID = $routeParams.aid;
        $scope.workingGroupID = $routeParams.wid;
        $scope.newForumPost = Contributions.defaultNewContribution();
        $scope.newForumPost.contributionType = "FORUM_POST";
        $scope.errors = [];
        $scope.wGroup = {};
        $scope.wGroupMembers = [];
        $scope.proposals = [];
        $scope.pendingInvitations = [];

        initializeWorkingGroup();
        initializeAssemblyCampaigns();

        //angular.forEach(localStorageService.get('workingGroups'), function(wGroup) {
        //    if(wGroup.groupId == $routeParams.wid) {
        //        $scope.wGroup = wGroup;
        //    }
        //    var res = WorkingGroups.workingGroupMembers($routeParams.aid, $routeParams.wid,
        //        $scope.wGroup.supportedMembership).get();
        //    res.$promise.then(function(data) {
        //        $scope.wGroupMembers = data;
        //    });
        //});
    }

    $scope.postContribution = function(content){
        var newContribution =
            Contributions.groupContribution($routeParams.aid, $routeParams.wid).save(content, function() {
            console.log("Created contribution wGroup: "+newContribution);
            localStorageService.set("currentContributionWGroup", newContribution);
        });
    }

    $scope.openNewInvitationModal = function(size)  {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: '/app/partials/invitation.html',
            controller: 'NewInvitationModalCtrl',
            size: size,
            resolve: {
                target: function () {
                    return $scope.wGroup;
                },
                type: function () {
                    return "GROUP";
                },
                defaultEmail: function() {
                    return $scope.wGroup.invitationEmail;
                }
            }
        });

        var modalInstance;

        modalInstance.result.then(
            function (newInvitation) {
                $scope.newInvitation = newInvitation;
            },
            function () {
                console.log('Modal dismissed at: ' + new Date());
            }
        );
    };

    function initializeWorkingGroup() {
        $scope.$root.startSpinner();
        var res = WorkingGroups.workingGroup($scope.assemblyID, $scope.workingGroupID).get();
        res.$promise.then(
            function (data) {
                $scope.wGroup = data;
                $scope.$root.stopSpinner();
                getWorkingGroupMembers($scope.assemblyID, $scope.workingGroupID);
                getWorkingGroupProposals($scope.assemblyID, $scope.workingGroupID);
                getInvitations($scope.workingGroupID);
            },
            function (error) {
                $scope.$root.stopSpinner();
                $scope.errors.unshift(error);
            }
        )
    }

    function initializeAssemblyCampaigns() {
        var res = Assemblies.assembly($scope.assemblyID).get();
        res.$promise.then(
            function (data) {
                $scope.assembly = data;
                $scope.assemblyCampaigns = data.campaigns;
            },
            function (error) {
                $scope.errors.unshift(error);
            }
        )
    }


    function getWorkingGroupMembers() {
        var res = WorkingGroups.workingGroupMembers($scope.assemblyID, $scope.workingGroupID,
            "ALL").query();
        res.$promise.then(
            function (data) {
                $scope.wGroupMembers = data;
            },
            function (error) {
                $scope.errors.unshift(error);
            }
        );
    }

    function getWorkingGroupProposals() {
        var res = WorkingGroups.workingGroupProposals($scope.assemblyID, $scope.workingGroupID).query();
        res.$promise.then(
            function (data) {
                $scope.proposals = data;
            },
            function (error) {
                $scope.errors.unshift(error);
            }
        );
    }

    function getInvitations(target) {
        $scope.pendingInvitations = Invitations.invitations(target,"INVITED").query();
        $scope.pendingInvitations.$promise.then(
            function(response){
                $scope.pendingInvitations = response;
            },
            function(error) {
                $scope.errors.push(error);
            }
        );
    }
});
import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import TopBanner from "@/components/TopBanner";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Edit, Flame, Medal, Plus, Target, Trophy} from "lucide-react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";

const TEST_ACCESS_TOKEN = "TEST_ACCESS_TOKEN";
const TEST_USER_ID = "TEST_USER_ID";

const GoalsScreen = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: "",
    unit: "",
    target: "",
    current_progress: "",
  });
  const [editedGoalId, setEditedGoalId] = useState(null);

  const queryClient = useQueryClient();

  // --- Frontend Change: Fetch goals from API ---
  const fetchGoals = async () => {
    const response = await fetch("http://localhost:3000/api/v1/business_progress/goals/goal_list", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: TEST_ACCESS_TOKEN }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.failed_msg);
    return data.goals;
  };

  // --- Frontend Change: Fetch quests from API ---
  const fetchQuests = async () => {
    const response = await fetch("http://localhost:3000/api/v1/business_progress/quests/list", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: TEST_ACCESS_TOKEN }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.failed_msg);
    return data.goals;
  };

  // --- Frontend Change: Fetch leaderboards and discovery from API ---
  const fetchLeaderboards = async () => {
    const discoveryResponse = await fetch("http://localhost:3000/api/v1/business_progress/leaderboard/discovery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const discoveryData = await discoveryResponse.json();
    if (!discoveryData.success) throw new Error(discoveryData.failed_msg);

    // Fetch top 3 entries for each leaderboard
    const leaderboards = await Promise.all(
      discoveryData.leaderboard.map(async (board) => {
        const response = await fetch("http://localhost:3000/api/v1/business_progress/leaderboard/list", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leaderboard_id: board.leaderboard_id,
            max_length: 3
          }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.failed_msg);
        return {
          ...board,
          entries: data.streaks,
        };
      })
    );
    return leaderboards;
  };

  // --- Frontend Change: Fetch streaks from API ---
  const fetchStreaks = async () => {
    const response = await fetch("http://localhost:3000/api/v1/business_progress/streaks/list", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: TEST_ACCESS_TOKEN }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.failed_msg);
    return data.streaks;
  };

  // --- Frontend Change: Fetch awards from API ---
  const fetchAwards = async () => {
    const response = await fetch("http://localhost:3000/api/v1/business_progress/awards/list", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: TEST_ACCESS_TOKEN }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.failed_msg);
    return data.awards;
  };

  // --- Frontend Change: React Query hooks for all new API calls ---
  const { data: goals = [], isLoading: isLoadingGoals, error: goalsError } = useQuery({
    queryKey: ["goals"],
    queryFn: fetchGoals,
  });
  const { data: quests = [], isLoading: isLoadingQuests, error: questsError } = useQuery({
    queryKey: ["quests"],
    queryFn: fetchQuests,
  });
  const { data: leaderboards = [], isLoading: isLoadingLeaderboards } = useQuery({
    queryKey: ["leaderboards"],
    queryFn: fetchLeaderboards,
  });
  const { data: streaks = [], isLoading: isLoadingStreaks } = useQuery({
    queryKey: ["streaks"],
    queryFn: fetchStreaks,
  });
  const { data: awards = [], isLoading: isLoadingAwards } = useQuery({
    queryKey: ["awards"],
    queryFn: fetchAwards,
  });

  // --- Frontend Change: Add goal mutation with proper query invalidation ---
  const addGoalMutation = useMutation({
    mutationFn: async (goal: typeof newGoal) => {
      const url = editedGoalId ?
        "http://localhost:3000/api/v1/business_progress/goals/edit" :
        "http://localhost:3000/api/v1/business_progress/goals/add";
      const backendGoal = {
        name: goal.name,
        goal_or_quest: "Goal",
        unit: goal.unit,
        target: parseFloat(goal.target),
        current_progress: parseFloat(goal.current_progress),
      }
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedGoalId ? {
          access_token: TEST_ACCESS_TOKEN,
          updated_goal: backendGoal,
          goal_uuid: editedGoalId,
        } : {
          access_token: TEST_ACCESS_TOKEN,
          goal: backendGoal,
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.failed_msg);
      return data.updated_goals;
    },
    onSuccess: () => {
      // --- Frontend Change: Invalidate queries separately for immediate UI update ---
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      setShowAddDialog(false);
      setNewGoal({ name: "", unit: "", target: "", current_progress: "" });
    },
  });

  const handleAddGoal = () => {
    addGoalMutation.mutate(newGoal);
  };

  // --- Frontend Change: Unified loading state for all new API calls ---
  if (isLoadingGoals || isLoadingQuests || isLoadingLeaderboards || isLoadingStreaks || isLoadingAwards) {
    return (
      <div className="min-h-screen bg-black text-[#F97316] flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (goalsError || questsError) {
    return (
      <div className="min-h-screen bg-black text-[#F97316] flex items-center justify-center">
        <div>Error loading data</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#F97316]">
      <TopBanner />
      <div className="p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          {/* --- Frontend Change: Money made UI element --- */}
          <div className="mb-4 flex justify-end">
            <div className="bg-[#F97316]/10 border border-[#F97316]/40 rounded-lg px-4 py-2 text-sm text-[#F97316] font-semibold shadow">
              The app has made you: <span className="text-lg font-bold">£1,234</span>
            </div>
          </div>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Goals & Quests</h1>
            <Button
              onClick={() => {
                setEditedGoalId(null);
                setShowAddDialog(true)
              }}
              className="bg-[#F97316] hover:bg-[#F97316]/80"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New
            </Button>
          </div>

          <div className="space-y-6">
            {/* --- Frontend Change: Goals Section, with space between number and unit --- */}
            <Card className="bg-black border border-[#F97316]/20">
              <CardHeader className="flex flex-row items-center space-x-2">
                <Target className="h-5 w-5" />
                <CardTitle>Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="p-4 border border-[#F97316]/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{goal.name}</h3>
                          <p className="text-sm text-white/60">
                            Target: {goal.target} {goal.unit}
                          </p>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="w-24 h-2 bg-[#F97316]/20 rounded-full">
                            <div
                              className="h-full bg-[#F97316] rounded-full"
                              style={{width: `${ Math.min(100, (goal.current_progress || 0) / goal.target * 100) }%`}}
                            />
                          </div>
                          <div className="pl-4">
                            <Edit
                              name="edit" className="h-4 w-4"
                              onClick={() => {
                                setEditedGoalId(goal.id);
                                setNewGoal({
                                  name: goal.name,
                                  unit: goal.unit,
                                  target: goal.target.toString(),
                                  current_progress: goal.current_progress,
                                });
                                setShowAddDialog(true);
                              }}/>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* --- Frontend Change: Quests Section, with space between number and unit --- */}
            <Card className="bg-black border border-[#F97316]/20">
              <CardHeader className="flex flex-row items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <CardTitle>Quests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quests.map((quest) => (
                    <div key={quest.id} className="p-4 border border-[#F97316]/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{quest.name}</h3>
                          <p className="text-sm text-white/60">
                            Target: {quest.target} {quest.unit}
                          </p>
                        </div>
                        <div className="w-24 h-2 bg-[#F97316]/20 rounded-full">
                          <div
                            className="h-full bg-[#F97316] rounded-full"
                            style={{ width: `${(quest.current_progress || 0) / quest.target * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* --- Frontend Change: Leaderboards Section --- */}
            <Card className="bg-black border border-[#F97316]/20">
              <CardHeader className="flex flex-row items-center space-x-2">
                <Medal className="h-5 w-5" />
                <CardTitle>Leaderboards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {leaderboards.map((board) => (
                    <div key={board.leaderboard_id} className="space-y-2">
                      <h3 className="font-medium text-lg">{board.name}</h3>
                      <p className="text-sm text-white/60">{board.description}</p>
                      <div className="space-y-2">
                        {board.entries?.map((entry, index) => (
                          <div
                            key={entry.user_id}
                            className={"flex items-center justify-between p-3 border border-[#F97316]/20 rounded-lg" +
                              (entry.user_id == TEST_USER_ID ? " bg-[#F97316]/10" : "")}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-lg font-bold">{index + 1}</span>
                              <span>{entry.username}</span>
                            </div>
                            <span>{entry.value} {board.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* --- Frontend Change: Streaks Section --- */}
            <Card className="bg-black border border-[#F97316]/20">
              <CardHeader className="flex flex-row items-center space-x-2">
                <Flame className="h-5 w-5" />
                <CardTitle>Streaks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {streaks.map((streak) => (
                    <div
                      key={streak.id}
                      className="p-4 border border-[#F97316]/20 rounded-lg flex items-center justify-between"
                    >
                      <span className="font-medium">{streak.name}</span>
                      <div className="flex items-center space-x-2">
                        <Flame className="h-4 w-4" />
                        <span className="text-lg font-bold">{streak.streak}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* --- Frontend Change: Awards Section --- */}
            <Card className="bg-black border border-[#F97316]/20">
              <CardHeader className="flex flex-row items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <CardTitle>Awards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {awards.length === 0 ? (
                    <div className="text-white/60">No awards yet.</div>
                  ) : (
                    awards.map((award) => (
                      <div key={award.id} className="p-4 border border-[#F97316]/20 rounded-lg">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{award.name}</span>
                          <span className="text-sm text-white/60">{award.description}</span>
                          <span className="text-xs text-white/40">Achieved: {award.achieved_date}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* --- Frontend Change: Add Goal Dialog remains unchanged except for newGoal state --- */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-black border-[#F97316]/20 text-white">
          <DialogHeader>
            <DialogTitle>{editedGoalId ? "Edit Goal" : "Add New Goal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newGoal.name}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                className="bg-black border-[#F97316]/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={newGoal.unit}
                onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                className="bg-black border-[#F97316]/20"
                placeholder="e.g., £, %, days"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="progress">Progress</Label>
              <Input
                id="target"
                type="number"
                value={newGoal.current_progress}
                max={newGoal.target}
                onChange={(e) => setNewGoal({ ...newGoal, current_progress: e.target.value })}
                className="bg-black border-[#F97316]/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Target</Label>
              <Input
                id="target"
                type="number"
                value={newGoal.target}
                onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                className="bg-black border-[#F97316]/20"
              />
            </div>
            <Button
              onClick={handleAddGoal}
              className="w-full bg-[#F97316] hover:bg-[#F97316]/80"
              disabled={addGoalMutation.isPending}
            >
              {editedGoalId ? (addGoalMutation.isPending ? "Saving..." : "Save Goal") : (addGoalMutation.isPending ? "Adding..." : "Add Goal")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoalsScreen; 
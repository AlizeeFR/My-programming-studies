package com.study.datastructs_algs;

import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;
import java.util.TreeMap;

public class Main {

    public static void main(String[] args) {

        //Part 1 of the assignment

        //The function createStateCapitalPairs() is defined at the bottom of the code to improve readability.

        String[][] stateCapitalPairs = createStateCapitalPairs();

        /* Here, we use a for-loop to iterate through and print the 2D array of states and their associated capitals.
         * Because there are 50 states and 50 capitals, i must stop at 50. However, the first dimension of the array
         * only has length 2 because the first index points to the array of states while the second index points to
         * the array of capitals. Since either has a length of 50, we can use either subarray's length to represent
         *  50 or write "50" as an integer literal. */

        for (int i = 0; i < 50; i++) {
            System.out.print("State: " + stateCapitalPairs[0][i] + "\n" +
                    "Capital: " + stateCapitalPairs[1][i] + "\n\n");
        }

        /* Sort the 2D array according to state capitals using BubbleSort. Since our 2D string array's first-index/second
         * element points to a subarray of state capitals, the bubbleSort(String[][] arr) method will sort based on
         * state capitals, as explained in the method documentation. For clarity's sake, we re-assign the changed 2D array
         * back into the same variable name, although it is not strictly necessary. */
        stateCapitalPairs = bubbleSort(stateCapitalPairs);

        int points = 0; //set up an integer variable to keep track of how many points the user currently has.
        Scanner requestInput = new Scanner(System.in); //prepare the program to read user input

        for (int i = 0; i < 50; i++) {
            System.out.println(stateCapitalPairs[0][i] + "'s capital is: \n" +
                    "(Note: you must enter something before proceeding to the next state)");
            requestInput.hasNext();
            String capital = requestInput.next();
            //check if the user's guess matches the capital, disregarding case. Add a point if true.
            if (capital.equalsIgnoreCase(stateCapitalPairs[1][i]))
                points++;
        }


        System.out.println("You scored " + points + " out of 50 points."); //Display the total amount of correct answers


        /* Part 2 of the assignment: Sorting & Searching HashMap. */

        Map<String, String> stateCapitalMap = new HashMap<>();

        /* Use a for-loop to create a HashMap of 50 keys and 50 values, with the first subarray making up the keys and
         * the second subarray making up the values. */
        for (int i = 0; i < 50; i++) {
            stateCapitalMap.put(stateCapitalPairs[0][i], stateCapitalPairs[1][i]);
        }

        /* Display HashMap content by using a for-each loop to iterate through the HashMap Collection. Each state is a key
         * and each value is the capital of that state. */
        for (Map.Entry<String, String> pairs : stateCapitalMap.entrySet()) {
            System.out.print("State: " + pairs.getKey() + "\n" + "Capital: " + pairs.getValue() + "\n\n");
        }

        /* Convert the HashMap into a TreeMap, which uses a binary search tree for storage and automatically sorts the
         * content based on the natural ordering of its keys.*/
        Map<String, String> stateCapitalTreeMap = new TreeMap<>();
        stateCapitalTreeMap.putAll(stateCapitalMap);

        //Request user input to display the corresponding capital for the entered state (non-case sensitive)
        System.out.println("What is the name of the state whose capital you would like to know?: ");
        requestInput.hasNext();
        String state = requestInput.next();
        String capitalizedState = state.substring(0, 1).toUpperCase() + state.substring(1);
        String capital = stateCapitalTreeMap.getOrDefault(capitalizedState, "\n You typed: " + capitalizedState + "\n No such state exists. Have you made a typo?");


    }

    /* This is an implementation of bubble sort on a 2D array, where the 2D array is sorted in alphabetical order of
     * the subarray of index 1/element 2 of the first dimension 2D String array "arr." In this code example, the subarray
     * represents state capitals. Because arrays are passed by reference, any modification made inside the function will
     * affect the array outside of the function. As such, we will not clone the array. Instead, we intiialize two variables
     * to use when swapping values inside of the array during the sorting process. */

    private static String[][] bubbleSort(String[][] arr) {
        String tempCapital = "";
        String tempState = "";
        for (int i = 0; i < arr[1].length; i++) {
            for (int j = 1; j < arr[1].length - i; j++) {
                /* Check if the current state capital comes earlier in the alphabet compared to its previous element,
                * ignoring case. If true, proceed to re-order the 2D array. Store the previous element's capital in a
                * temporary variable. Then replace the previous index with the current capital and replace the current
                * index with the temporary capital from earlier. Repeat the process for the state subarray indices and
                * values to maintain the appropriate position such that the state has the same index as its associated
                * capital's index.
                * */
                if (arr[1][j].compareToIgnoreCase(arr[1][j - 1]) < 0) {
                    tempCapital = arr[1][j - 1];
                    arr[1][j - 1] = arr[1][j];
                    arr[1][j] = tempCapital;

                    tempState = arr[0][j - 1];
                    arr[0][j - 1] = arr[0][j];
                    arr[0][j] = tempState;

                }
            }
        }
        return arr;
    }


    /* As the name suggests, the function creates a 2D String array where the first index contains an array of state
     * names in alphabetical order and the second index of the first array contains an array of state capital names in
     * alphabetical order. The state names and capital names are associated with one another based on index. For
     * example, if Florida is located at [0][8], where [0] represents states, and the second index represents the
     * state name, the capital of Florida will be located at [1][8], where [1] represents the capital of a state, and
     * index [8] contains the capital of Florida. As such, states and capitals are paired based on the second index. */
    private static String[][] createStateCapitalPairs() {
        String[][] pairs =
                {
                        {"Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
                                "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas",
                                "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
                                "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
                                "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
                                "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas",
                                "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
                        },
                        {"Montgomery", "Juneau", "Phoenix", "Little Rock", "Sacramento", "Denver", "Hartford", "Dover",
                                "Tallahassee", "Atlanta", "Honolulu", "Boise", "Springfield", "Indianapolis", "Des Moines",
                                "Topeka", "Frankfort", "Baton Rouge", "Augusta", "Annapolis", "Boston", "Lansing",
                                "St. Paul", "Jackson", "Jefferson City", "Helena", "Lincoln", "Carson City", "Concord",
                                "Trenton", "Santa Fe", "Albany", "Raleigh", "Bismarck", "Columbus", "Oklahoma City",
                                "Salem", "Harrisburg", "Providence", "Columbia", "Pierre", "Nashville", "Austin",
                                "Salt Lake City", "Montpelier", "Richmond", "Olympia", "Charlestone", "Madison", "Cheyenne"
                        }
                };
        return pairs;
    }
}
